import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from "@aws-sdk/client-cognito-identity-provider";

// --- Define a map of supported AWS SDK clients ---
// This map allows us to dynamically get the client constructor based on the service name.
export const SUPPORTED_AWS_SDK_CLIENTS: { [key: string]: any } = {
    "CognitoIdentityProviderClient": CognitoIdentityProviderClient,
    // Add more clients here as needed
};

// --- Define a map of supported commands for each client ---
// This map allows us to dynamically get the command constructor based on the client and action.
// The keys here should match the 'service' and 'action' values in your incoming event.
export const SUPPORTED_AWS_SDK_COMMANDS: { [clientName: string]: { [commandName: string]: any } } = {
    CognitoIdentityProviderClient: {
        "DescribeUserPoolCommand": DescribeUserPoolCommand,
    },
};