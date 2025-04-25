Feature: App Attestation
    To reduce the risk of Cognito being exploited by being
    called by anything other than the officially released versions of the apps.

    Scenario Outline: Attestation middleware is ran prior to calls to protected services
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <user> attestation header
        Then the attestation middleware is invoked

        Examples:
            | user  |
            | valid |

    Scenario Outline: Invalid attestation tokens are rejected
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <user> attestation header
        Then the request is rejected with a <response> status

        Examples:
            | user    |
            | invalid |

#   Scenario 2: Request includes an expired attestation token
#     GIVEN there is a valid attestation token
#     AND it has expired
#     WHEN a request is made to the auth endpoint
#     THEN the request is rejected

#   Scenario 3: Request includes a token from an unrecognized app
#     GIVEN there is a valid token
#     AND the application ID doesn't match our app
#     WHEN a request is made to the auth endpoint
#     THEN the request is rejected

#   Scenario 4: Request is missing an attestation token
#     GIVEN there is an missing attestation token
#     WHEN a request is made to the auth endpoint
#     THEN the request is rejected

#   Scenario 5: Successful requests are logged
#     GIVEN I make a request to the auth endpoint
#     WHEN app attestation is successful
#     THEN it is logged in Cloudwatch

#   Scenario 6: Failed requests are logged
#     GIVEN I make a request to the auth endpoint
#     WHEN app attestation fails
#     THEN it is logged in Cloudwatch