from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_rds as rds,
    aws_elasticloadbalancingv2 as elbv2,
    aws_iam as iam,
    aws_s3 as s3,
    aws_cloudwatch as cloudwatch,
    aws_sns as sns,
    aws_sqs as sqs,
    aws_logs as logs,
    CfnOutput,
    Duration,
    RemovalPolicy,
)
from constructs import Construct

class SREAgentStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # VPC Configuration
        vpc = ec2.Vpc(
            self, "SREAgentVPC",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Database",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ]
        )

        # Security Groups
        alb_sg = ec2.SecurityGroup(
            self, "ALBSecurityGroup",
            vpc=vpc,
            description="Security group for Application Load Balancer",
            allow_all_outbound=True
        )
        alb_sg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(80),
            description="HTTP access"
        )
        alb_sg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(443),
            description="HTTPS access"
        )

        app_sg = ec2.SecurityGroup(
            self, "AppSecurityGroup",
            vpc=vpc,
            description="Security group for SRE Agent application",
            allow_all_outbound=True
        )
        app_sg.add_ingress_rule(
            peer=alb_sg,
            connection=ec2.Port.tcp(8000),
            description="API access from ALB"
        )

        db_sg = ec2.SecurityGroup(
            self, "DatabaseSecurityGroup",
            vpc=vpc,
            description="Security group for RDS database",
            allow_all_outbound=False
        )
        db_sg.add_ingress_rule(
            peer=app_sg,
            connection=ec2.Port.tcp(5432),
            description="Database access from application"
        )

        # S3 Bucket for ML Models
        # Create S3 bucket for ML models. Do not hard-code the bucket name
        # with a placeholder account id (e.g. YOUR_ACCOUNT_ID) because that
        # can produce invalid bucket names. Let CDK generate a safe name
        # or provide a validated, lowercase bucket name via context/parameters.
        model_bucket = s3.Bucket(
            self, "SREAgentModelBucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # RDS Database
        db_subnet_group = rds.SubnetGroup(
            self, "SREAgentDBSubnetGroup",
            vpc=vpc,
            description="Subnet group for SRE Agent database",
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            )
        )

        database = rds.DatabaseInstance(
            self, "SREAgentDatabase",
            # Specify a supported Postgres engine major version from the
            # installed aws_cdk so the CDK construct API is satisfied.
            # If you prefer a different major version, replace VER_16_3
            # with another available constant from rds.PostgresEngineVersion.
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16_3
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3,
                ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            ),
            security_groups=[db_sg],
            subnet_group=db_subnet_group,
            database_name="sreagent",
            credentials=rds.Credentials.from_generated_secret(
                "sreagent",
                secret_name="sre-agent-db-credentials"
            ),
            allocated_storage=20,
            max_allocated_storage=100,
            storage_encrypted=True,
            backup_retention=Duration.days(7),
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY
        )

        # ECS Cluster
        cluster = ecs.Cluster(
            self, "SREAgentCluster",
            vpc=vpc,
            container_insights=True,
            enable_fargate_capacity_providers=True
        )

        # Task Definition for API
        api_task_definition = ecs.FargateTaskDefinition(
            self, "SREAgentAPITask",
            memory_limit_mib=4096,
            cpu=2048,
            task_role=self.create_task_role(),
            execution_role=self.create_execution_role()
        )

        # Add API container
        api_container = api_task_definition.add_container(
            "SREAgentAPI",
            image=ecs.ContainerImage.from_asset("../python-backend"),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="sre-agent-api",
                log_retention=logs.RetentionDays.ONE_WEEK
            ),
            environment={
                "DATABASE_URL": f"postgresql://sreagent:{{{{resolve:secretsmanager:{database.secret.secret_name}:SecretString:password}}}}@{database.instance_endpoint.hostname}:5432/sreagent",
                "AWS_REGION": self.region,
                "MODEL_CACHE_DIR": "/tmp/models",
                "API_HOST": "0.0.0.0",
                "API_PORT": "8000"
            },
            port_mappings=[ecs.PortMapping(container_port=8000)]
        )

        # Add Redis container
        redis_container = api_task_definition.add_container(
            "Redis",
            image=ecs.ContainerImage.from_registry("redis:7-alpine"),
            logging=ecs.LogDrivers.aws_logs(
                stream_prefix="sre-agent-redis",
                log_retention=logs.RetentionDays.ONE_WEEK
            ),
            port_mappings=[ecs.PortMapping(container_port=6379)]
        )

        # Fargate Service for API
        api_service = ecs.FargateService(
            self, "SREAgentAPIService",
            cluster=cluster,
            task_definition=api_task_definition,
            security_groups=[app_sg],
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            desired_count=2,
            assign_public_ip=False
        )

        # Application Load Balancer
        alb = elbv2.ApplicationLoadBalancer(
            self, "SREAgentALB",
            vpc=vpc,
            internet_facing=True,
            security_group=alb_sg
        )

        # Target Group for API
        api_target_group = elbv2.ApplicationTargetGroup(
            self, "APITargetGroup",
            vpc=vpc,
            port=8000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            target_type=elbv2.TargetType.IP,
            health_check=elbv2.HealthCheck(
                path="/api/v1/health",
                healthy_http_codes="200",
                interval=Duration.seconds(30),
                timeout=Duration.seconds(5),
                healthy_threshold_count=2,
                unhealthy_threshold_count=3
            )
        )

        # Add targets to target group
        api_target_group.add_target(api_service)

        # Listener
        listener = alb.add_listener(
            "APIListener",
            port=80,
            protocol=elbv2.ApplicationProtocol.HTTP,
            default_target_groups=[api_target_group]
        )

        # SNS Topic for Alerts
        alert_topic = sns.Topic(
            self, "SREAgentAlertTopic",
            topic_name="sre-agent-alerts",
            display_name="SRE Agent Alerts"
        )

        # SQS Queue for Processing
        processing_queue = sqs.Queue(
            self, "SREAgentProcessingQueue",
            queue_name="sre-agent-processing",
            visibility_timeout=Duration.minutes(5),
            retention_period=Duration.days(4)
        )

        # CloudWatch Dashboard
        dashboard = cloudwatch.Dashboard(
            self, "SREAgentDashboard",
            dashboard_name="SREAgentMonitoring"
        )

        # Add metrics to dashboard
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="API Requests",
                left=[api_target_group.metric_request_count()],
                right=[api_target_group.metric_target_response_time()]
            ),
            cloudwatch.GraphWidget(
                title="Database Connections",
                left=[database.metric_database_connections()]
            )
        )

        # Outputs
        CfnOutput(
            self, "LoadBalancerDNS",
            value=alb.load_balancer_dns_name,
            description="Application Load Balancer DNS name"
        )

        CfnOutput(
            self, "DatabaseEndpoint",
            value=database.instance_endpoint.hostname,
            description="RDS database endpoint"
        )

        CfnOutput(
            self, "S3BucketName",
            value=model_bucket.bucket_name,
            description="S3 bucket for ML models"
        )

        CfnOutput(
            self, "SNSTopicARN",
            value=alert_topic.topic_arn,
            description="SNS topic for alerts"
        )

    def create_task_role(self) -> iam.Role:
        """Create IAM role for ECS tasks"""
        role = iam.Role(
            self, "SREAgentTaskRole",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        )

        # Add permissions for S3, CloudWatch, etc.
        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonS3ReadOnlyAccess")
        )
        
        role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "cloudwatch:PutMetricData",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
                resources=["*"]
            )
        )

        return role

    def create_execution_role(self) -> iam.Role:
        """Create IAM role for ECS task execution"""
        role = iam.Role(
            self, "SREAgentExecutionRole",
            assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        )

        # Add permissions for ECS task execution
        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonECSTaskExecutionRolePolicy")
        )

        return role
