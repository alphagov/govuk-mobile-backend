from __future__ import annotations

from typing import Any
from checkov.cloudformation.checks.resource.base_resource_value_check import (
    BaseResourceValueCheck,
)
from checkov.common.models.enums import CheckCategories, CheckResult


class ApiExecutionLoggingEnabled(BaseResourceValueCheck):
    def __init__(self) -> None:
        name = "Ensure API execution logging is enabled (stage MethodSettings loggingLevel)"
        id = "CKV2_GOVUKAPP_3"
        supported_resources = [
            "AWS::Serverless::Api",
            "AWS::ApiGateway::Stage",
        ]
        categories = [CheckCategories.LOGGING]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def get_inspected_key(self) -> str:
        # we need custom logic; not a single key
        return "Properties"

    def scan_resource_conf(self, conf: dict[str, Any]) -> CheckResult:
        props = conf.get("Properties", {})
        method_settings = props.get("MethodSettings")
        if not isinstance(method_settings, list):
            return CheckResult.FAILED
        wildcard = next(
            (m for m in method_settings if m.get("ResourcePath") == "/*" and m.get("HttpMethod") == "*"),
            None,
        )
        if not wildcard:
            return CheckResult.FAILED
        level = wildcard.get("LoggingLevel")
        if level in ("INFO", "ERROR"):
            return CheckResult.PASSED
        return CheckResult.FAILED


scanner = ApiExecutionLoggingEnabled()


