/* Copyright (c) 2023 The Building Blocks Limited. All rights reserved. */
import { createMachine, actions, assign } from "xstate";

const docDescription = "Copyright (c) 2023 The Building Blocks Limited\n\nModels a User's view of the states for one of its helpers. The User state machine causes a new Helper state machine to be created for every helper they add. The Helper state machine maintains the relationship with the helper on the User's behalf.  \n\nThe Helper machine signals the User state machine with relevant events:\n- helperAdded\n- helperInSync\n- helperOutOfSync\n- helperRemoved";
export const createdeRecHelperStateMachine = (helper) => {
    return createMachine({
        /** @xstate-layout N4IgpgJg5mDOIC5QAswBsAOYBOA6DAhgJbYBKYAjgK5wAukAxISQCpEC2YA9lbQNoAGALqJQGLrCK0iXAHaiQAD0QBmACwA2XACYAHGrW7tejbpUBOXQBoQAT0QBGXbtxqVz8w43aVG8+4BfAJtUTBx8YjJKGlh6CCZI8gAzKlhIQREkEHFJaTkFZQQHB0NcXQB2co1ygQFdDQNy6ztEDQFtXAE1AU829wcVcu0gkPQsPGYo6jpGSYBBAGMFsAw4jIUcqRl5LMLK3F8AVjUHAV81Q7NytRt7BEbOtW1DjUPDlQchkZBQ8YiSRhUWQABUS0To6yymzyO1AhXMfk6lwsak8ugEpnMt0Q6I6AjeFRK72OPm+v3Ck0guB4tAA8kkAMq2WQLBgAazAKzmaCIADcwOQMGhbORlnz0sINhItvldqpyipcJcHNoSicEfjDtiEP4XNUVNpahiGs81GSxhTIlSafSmSz2ZyMNzxWxODTIWJpTCCqpDrhzKjfBoVO0PuYFdqjGpcN5fOZjod49oEeawhMrRBqbxbczWRyuTz+QARdAEWwAUTQBAwaQgHuyXu2PoQCqVn0O2gV6JUPeM2r8foxhyqVV0-mew2CPwt6YBmaIsjtecdzuLpYrVdgWDrkqhjdlcMQ5RKB3K-mKDks9QNkeKB3DKouBl0xxUqb+lPni9zDoL4sFwqimA4o7pknq5E2coINULj+JUJTaGoNRPDcLTQc4SrnD4ZwqG8GLvpac64AuS6-k6hZgK63C8PW0KQYeCAWHq5gYs8CqITUnaRk8uBDLUx76G4ehvt8shcBAcAKOS2BShBB5KIgAC0bRIhiPZ+KO7TlNqpwCP67jOD0KqJgYZpTtJ-xTDEcSyTKsIKfc5S4F4XaVGcl7OCo2p6IOGj6noGLdBoDgEbO2CQLZ3pQYpKqqcGcaadofjah2LhnA0xRmEmImjGmlnWtmjK5pF9EOacDhthUfTvCG6hYmhaKnsGyZtMG3ahflX5LiV8mFMF0aGNc7gvB25iqtq8bRiqzVjmYLz6B1Ym0KCc49fZhSnOUfpbSGfFuBciE6RiFUGgGAYdqYtSHEEQRAA */
        id: 'helper',
        description: docDescription,
        initial: 'pairRequested',
        context: {
            helperId: helper,

        },
        states: {
            pairRequested: {
                entry: ['sendPairRequest', 'startPairTimer'],
                description: "Awaiting pair response",
                on: {
                    'pairTimeout': {
                        description: 'No response from Helper',
                        actions: ['sendPairRequest', 'startPairTimer']
                    },
                    'pairRefused': {
                        description: 'Helper declines pair request',
                        target: 'notPaired'
                    },
                    'pairAccepted': {
                        description: 'Helper accepts pair request',
                        target: 'paired'
                    }
                }
            },
            paired: {
                type: 'compound',
                entry: ['stopPairTimer', 'signalHelperAdded'],
                description: "Pairing accepted",
                initial: 'outOfSync',
                states: {
                    outOfSync: {
                        entry: ['sendKeepAliveRequest', 'restartKeepAliveTimer'],
                        description: 'Helper is not online',
                        on: {
                            'keepAliveReplyReceived': {
                                actions: ['stopKeepAliveTimer', 'signalHelperInSync'],
                                target: 'inSync',
                            },
                            'keepAliveTimeout': {
                                actions: ['restartKeepAliveDelay'],
                            },
                            'keepAliveDelayElapsed': {
                                actions: ['sendKeepAliveRequest', 'restartKeepAliveTimer'],
                            }
                        }
                    },
                    inSync: {
                        entry: ['restartKeepAliveDelay'],
                        description: 'Helper is online',
                        on: {
                            'keepAliveDelayElasped': {
                                actions: ['sendKeepAliveRequest', 'restartKeepAliveTimer'],
                            },
                            'keepAliveReplyReceived': {
                                actions: 'restartKeepAliveDelay',
                                target: 'inSync',
                            },
                            'keepAliveTimeout': {
                                actions: ['signalHelperOutOfSync'],
                                target: 'outOfSync'
                            }
                        }
                    }
                },
                on: {
                    'unPairRequest': {
                        description: 'Helper discontinues pairing or User removes Helper',
                        target: 'notPaired',
                    }
                }
            },
            notPaired: {
                type: 'final',
                exit: 'signalHelperRemoved',
            }
        },
    });
};