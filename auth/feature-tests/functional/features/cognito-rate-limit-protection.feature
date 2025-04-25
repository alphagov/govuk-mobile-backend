Feature: Cognito User Pool rate limit protection
    Scenario: Exceeding the WAF rate limit on the Cognito Identity Provider endpoint
        Given The Cognito Identity Provider endpoint
        When Too many requests are sent to the endpoint
        Then There should be a 429 Too Many Requests response and this should be logged in CloudWatch





