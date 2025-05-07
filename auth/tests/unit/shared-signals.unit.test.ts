import { describe, it } from "vitest";
import { loadTemplateFromFile } from '../common/template'

const template = loadTemplateFromFile('./template.yaml')

describe('shared signals', () => {
    it('should provision an api gateway', () => {
        template.hasResourceProperties("AWS::Serverless::Api", {
            Name: {
                "Fn::Join": [
                    "-",
                    [
                        {
                            Ref: "AWS::StackName",
                        },
                        "shared-signals",
                        {
                            "Fn::Select": [
                                4,
                                {
                                    "Fn::Split": [
                                        "-",
                                        {
                                            "Fn::Select": [
                                                2,
                                                {
                                                    "Fn::Split": [
                                                        "/",
                                                        {
                                                            Ref: "AWS::StackId",
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                ],
            }
        })
    })

    it('should have a receiver endpoint', () => {
        template.hasResourceProperties("AWS::Serverless::Function", {
            Events: {
                HelloWorldApi: {
                    Properties: {
                        Path: "/receiver"
                    }
                }
            },
            FunctionName: {
                "Fn::Join": [
                    "-",
                    [
                        {
                            Ref: "AWS::StackName",
                        },
                        "shared-signals-receiver",
                        {
                            "Fn::Select": [
                                4,
                                {
                                    "Fn::Split": [
                                        "-",
                                        {
                                            "Fn::Select": [
                                                2,
                                                {
                                                    "Fn::Split": [
                                                        "/",
                                                        {
                                                            Ref: "AWS::StackId",
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                ],
            }
        })
    })
})