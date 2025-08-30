#!/usr/bin/env python3
import aws_cdk as cdk
from sre_agent_stack import SREAgentStack

app = cdk.App()
SREAgentStack(app, "SREAgentStack",
    env=cdk.Environment(
        account="347278393582",  # Replace with your AWS account ID
        region="us-east-1"  # Change as needed
    )
)

app.synth()
