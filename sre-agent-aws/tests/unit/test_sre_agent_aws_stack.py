import aws_cdk as core
import aws_cdk.assertions as assertions

from sre_agent_aws.sre_agent_aws_stack import SreAgentAwsStack

# example tests. To run these tests, uncomment this file along with the example
# resource in sre_agent_aws/sre_agent_aws_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = SreAgentAwsStack(app, "sre-agent-aws")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
