Feature: PKCE Token Generation

    Scenario Outline: Successfully generate a token using PKCE
        Given an app initiates a login with <user> credentials
        When initiate the token exchange
        Then I should receive an auth tokens
        And the token should be correct validity period
        And id_token should be have correct email address
       
        Examples:
            | user  |
            | valid |