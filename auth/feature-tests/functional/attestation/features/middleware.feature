Feature: App attestation hook

    The app attestation check is made prior to calls to auth initiation.

    Scenario: Attestation middleware is ran prior to calls to protected services
        Given an app initiates a login with valid credentials
        When the request is made to authenticate
        Then the attestation middleware is invoked

