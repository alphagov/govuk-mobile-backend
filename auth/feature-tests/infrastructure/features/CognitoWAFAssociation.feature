Feature:Cognito Userpool is associated with a WAF
    Scenario: A template can associate theCognito Userpool with a WAF
        Given a template to deploy associate Cognito Userpool with a WAF
        Then the template must have the required resource and properties to deploy the association between Cognito Userpool and a WAF