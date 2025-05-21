Feature: Verify Shared Signal Token
    As a system
    I want to verify the shared signal token
    So that I can ensure secure communication between services

    Scenario: Valid shared signal token
        Given a valid client ID and secret are provided
        When the token is generated
        Then the token should be valid
        And the token should be a valid JWT

    Scenario: Invalid shared signal token
        Given an invalid client ID and secret is provided
        When the token generation is attempted
        Then the token is not generated