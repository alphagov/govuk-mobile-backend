Feature: GOV UK Cognito Userpool is associated with a WAF
    Scenario: A template can associate the GOV UK Cognito Userpool with a WAF
        Given a template to deploy associate GOV UK Mobile Cognito Userpool with a WAF
        Then the template must have the required resource and properties to deploy the association between GOV UK Mobile Cognito Userpool and a WAF