import "dotenv/config";

const getTestConfig = () => {
  const requiredVars = [
    "CFN_ChatApiGatewayId",
    "CFN_ChatApiGatewayResourceId",
    "CFN_ChatApiGatewayMethodId",
    "CFN_ChatApiGatewayDeploymentId",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return {
    chatApiGatewayId: process.env.CFN_ChatApiGatewayId!,
    chatApiGatewayResourceId: process.env.CFN_ChatApiGatewayResourceId!,
    chatApiGatewayMethodId: process.env.CFN_ChatApiGatewayMethodId!,
    chatApiGatewayDeploymentId: process.env.CFN_ChatApiGatewayDeploymentId!,
  };
};

export const testConfig = getTestConfig();
