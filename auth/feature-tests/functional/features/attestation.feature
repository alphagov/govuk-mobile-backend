Feature: App Attestation
    To reduce the risk of Cognito being exploited by being
    called by anything other than the officially released versions of the apps.

    Scenario Outline: Attestation middleware is ran prior to calls to protected services
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the attestation middleware is invoked

        Examples:
            | user  | header |
            | valid | valid  |

    Scenario Outline: Unsuccessful requests are logged
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the unsuccessful request is logged

        Examples:
            | user  | header  |
            | valid | invalid |

    Scenario Outline: Attestation tokens are verified
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the response status is <status>

        Examples:
            | user  | header  | status |
            | valid | valid   | 200    |
            | valid | invalid | 401    |
            | valid | expired | 401    |
            | valid | missing | 400    |
            # Todo:
            # | valid | unknown_app | 401    |
