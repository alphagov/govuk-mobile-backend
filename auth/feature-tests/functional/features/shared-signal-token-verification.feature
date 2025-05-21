Feature: Verify Shared Signal Token
    As a system
    I want to verify the shared signal token
    So that I can ensure secure communication between services

    Scenario: Valid shared signal token
        Given a valid client ID and secret are provided
        When the token is generated
        Then the token should be valid

    # Scenario: Invalid shared signal token
    #     Given an invalid shared signal token is provided
    #     When the token is verified
    #     Then the verification should fail

    # Scenario: Missing shared signal token
    #     Given no shared signal token is provided
    #     When the token is verified
    #     Then the verification should fail with an error message