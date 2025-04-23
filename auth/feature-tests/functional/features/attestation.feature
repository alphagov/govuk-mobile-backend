Feature: App attestation hook

    The app attestation check is made prior to calls to auth initiation.

    Scenario Outline: Attestation middleware is ran prior to calls to protected services
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate
        Then the attestation middleware is invoked

        Examples:
            | user  |
            | valid |

