Feature: Token Generation

    Scenario: Generate only access token
        Given Shared Signal has a valid client and secret
        When I request a token generation
        Then I should receive an access token
        And I should not receive a refresh token