#!/bin/bash

globalEmail="git config --global --get user.email"
signingKey="git config --global --get user.signingkey"
gpgsigning="git config --global --get commit.gpgsign"
emaildomain="(digital.cabinet-office.gov.uk|users.noreply.github.com)"

if [[ !"$globalEmail" =~ "$emaildomain" ]];
then
        echo "Commit email should be from the digital.cabinet-office.gov.uk domain"
        echo "Global commit email: "$globalEmail""
        exit 1
fi

if [[ -z "$signingKey" ]];
then
        echo "No signing key found. Check global gitconfig"
        exit 1
fi

if [[ -z "$gpgsigning" ]];
then
    echo "GPG Commit signing must be turned on"
    exit 1
fi

