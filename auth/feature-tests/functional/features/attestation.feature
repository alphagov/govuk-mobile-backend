Feature: App Attestation
    To reduce the risk of Cognito being exploited by being
    called by anything other than the officially released versions of the apps.

    Scenario Outline: Unsuccessful requests are logged
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the <log> request is logged

        Examples:
            | user  | header  | log     |
            | valid | missing | failure |

    Scenario Outline: Valid attestation tokens are accepted
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the <log> request is logged

        Examples:
            | user  | header | log     |
            | valid | valid  | success |

    Scenario Outline: Attestation tokens are verified
        Given an app initiates a login with <user> credentials
        When the request is made to authenticate with <header> attestation header
        Then the response status is <status>
        And the response message is <message>

        Examples:
            | user  | header      | status | message                                       |
            | valid | invalid     | 401    | Attestation token is invalid                  |
            | valid | expired     | 401    | Attestation token has expired                 |
            | valid | missing     | 400    | Invalid Request                               |
            | valid | unknown_app | 401    | Unknown app associated with attestation token |