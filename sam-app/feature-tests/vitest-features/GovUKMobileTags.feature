Feature: Resources are tagged correctly
    Scenario: A template has the correct resource tags 
        Given a template with AWS resources 
        Then the template's resources must have the required tags