#!/bin/bash

STACK_NAME="n11484209-infrastructure"
TEMPLATE_FILE="template.yaml"

# Function to check stack status
check_stack_status() {
    aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text
}

# Function to get stack events
get_stack_events() {
    aws cloudformation describe-stack-events --stack-name $STACK_NAME --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' --output text
}

# Delete the stack if it exists and is in ROLLBACK_COMPLETE state
if aws cloudformation describe-stacks --stack-name $STACK_NAME &>/dev/null; then
    STACK_STATUS=$(check_stack_status)
    if [ "$STACK_STATUS" = "ROLLBACK_COMPLETE" ]; then
        echo "Stack is in ROLLBACK_COMPLETE state. Deleting the stack..."
        aws cloudformation delete-stack --stack-name $STACK_NAME
        aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
        echo "Stack deleted successfully."
    fi
fi

# Create or update the stack
if ! aws cloudformation describe-stacks --stack-name $STACK_NAME &>/dev/null; then
    echo "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME
else
    echo "Updating existing stack..."
    if ! aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM; then
        echo "No updates are to be performed."
        exit 0
    fi
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME
fi

# Check final stack status
FINAL_STATUS=$(check_stack_status)
if [ "$FINAL_STATUS" = "CREATE_COMPLETE" ] || [ "$FINAL_STATUS" = "UPDATE_COMPLETE" ]; then
    echo "Stack deployment successful!"
    aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table
else
    echo "Stack deployment failed. Final status: $FINAL_STATUS"
    echo "Fetching error details..."
    get_stack_events
    exit 1
fi
