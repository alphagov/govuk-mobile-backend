from checkov.cloudformation.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class LambdaFunctionRolePermissionsBoundaryCheck(BaseResourceCheck):
    def __init__(self):
        name = "Ensure AWS::Serverless::Function has a Role and its PermissionsBoundary is set"
        id = "CKV2_GOVUKAPP_1"
        supported_resources = ["AWS::Serverless::Function"]
        categories = [CheckCategories.IAM]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf, cfn_template=None):

        properties = conf.get("Properties", {})

        role_ref = properties.get("Role")
        if not role_ref:
            return CheckResult.FAILED

        if isinstance(role_ref, dict) and "Ref" in role_ref:
            role_name = role_ref["Ref"]
        elif isinstance(role_ref, dict) and "Fn::GetAtt" in role_ref:
            role_name = role_ref["Fn::GetAtt"][0]
        else:
            return CheckResult.FAILED

        # Check the IAM role in the template
        if cfn_template and "Resources" in cfn_template:
            role_resource = cfn_template["Resources"].get(role_name)
            if role_resource and role_resource.get("Type") == "AWS::IAM::Role":
                permissions_boundary = role_resource.get("Properties", {}).get("PermissionsBoundary")
                if permissions_boundary:
                    return CheckResult.PASSED
                else:
                    return CheckResult.FAILED

        return CheckResult.PASSED


check = LambdaFunctionRolePermissionsBoundaryCheck()
