/* Copyright (c) 2023 The Building Blocks Limited. All rights reserved. */
import { createMachine, actions, assign } from "xstate";

const { log } = actions;

export const minQuorum = (context) => {
	return Math.ceil(context.helperCount / 2);
};

function validHelperOnlineEvent(context, event, currentlyActive) {
	const helper = context.helpers.get(event.helperId?.toLowerCase());
	if (helper && helper.helperAccepted) {
		return  helper.helperOnline === currentlyActive;
	}
	console.warn(`Event '${event.type}' invalid for helperId '${event.helperId}'`);
	return false;
}

const isValidOnlineHelperEvent = (context, event) => {
	return validHelperOnlineEvent(context, event, false);
};

const isValidOfflineHelperEvent = (context, event) => {
	return validHelperOnlineEvent(context, event, true);
};

const isStaticQuorum = (context) => {
	return context.helpersOnline >= minQuorum(context);
};

const isQuorum = (context, event) => {
	if (validHelperOnlineEvent(context, event, false)) {
		return context.helpersOnline >= minQuorum(context) - 1;
	}
	return context.helpersOnline >= minQuorum(context);
};

const isNotQuorum = (context, event) => {
	if (validHelperOnlineEvent(context, event, true)) {
		return context.helpersOnline <= minQuorum(context);
	}
	return context.helpersOnline < minQuorum(context);
};

const countOnline = (context, event) => {
	let inSync = 0;
	for (let h of context.helpers.values()) {
		if (h.helperOnline) {
			inSync++;
		}
	}
	return inSync;
};

export const minHelpers = 3;

function validHelperAcceptEvent(context, event, currentlyActive) {
	const helper = context.helpers.get(event.helperId?.toLowerCase());
	if (helper) {
		return helper.helperAccepted === currentlyActive;
	}
	console.warn(`Event '${event.type}' invalid for helperId '${event.helperId}'`);
	return false;
}

const isValidAddHelperEvent = (context, event) => {
	return validHelperAcceptEvent(context, event, false);
};

const isValidRemoveHelperEvent = (context, event) => {
	return validHelperAcceptEvent(context, event, true);
};

const isEnoughHelpers = (context, event) => {
	if (validHelperAcceptEvent(context, event, false)) {
		return context.helperCount + 1 >= minHelpers;
	}
	return context.helperCount >= minHelpers;
};

const isTooFewHelpers = (context, event) => {
	if (validHelperAcceptEvent(context, event, true)) {
		return context.helperCount - 1 < minHelpers;
	}
	return context.helperCount < minHelpers;
};

const countHelpers = (context, event) => {
	let accepted = 0;
	for (let h of context.helpers.values()) {
		if (h.helperAccepted) {
			accepted++;
		}
	}
	return accepted;
};

const isValidNewHelper = (context, event) => {
	return event.helperId !== "" && !context.helpers.has(event.helperId.toLowerCase());
};

const statusLogger = (context, event) =>
	`Event '${event.type}' not matched in current state: helperCount: ${context.helperCount} helpersOnline: ${context.helpersOnline}`;

class Helper {
	helperId: number;
	helperAccepted: boolean;
	helperOnline: boolean;
	constructor(id, accepted: boolean = false, online: boolean = false) {
		this.helperId = id;
		this.helperAccepted = accepted;
		this.helperOnline = online;
	}
}

const docDescription = "Copyright (c) 2023 The Building Blocks Limited\n\nDescribes a DeRec User's operational state in respect of its Helpers.\n\nThe User state machine receives notifications from the various independent Helper state machines to maintain overall state in respect of minimum numbers of helpers and requirements for a quorum of those helpers to be online for the service to be operational."
export const deRecHelperControllerStateMachine = createMachine(
	{
		/** @xstate-layout N4IgpgJg5mDOIC5QFdZgE4GIAWYA2ADhgJIB2AygJ6kDGA2gAwC6ioBA9rAJYAuX7pViAAeiAKwAOACwA6AEwA2MZICMUsQHYAzArliANCEriVAThlSJGhRokqJurSo0BfF4dQYc+IugDyyDx+AGZUtIwsSCAc3HwCQqIIGqYaMqYKDClqGmJyclqmhsYIYmYWVjZ2DvnObh5oWLiEGACCEBCQEUIxvPyCUYlaVjK2ppq6pgwF40Um5pbWYplScioFWnUgno0+GABKYAC27ABunczdnL3xA4j25tkOCqZyUgxKEgZGc+XWtvaOWruLYNTAAKi6UR6cX6oEGchkKlW72UK1ykgksxKDFS1hUDE+ijydg0rmB2xkPHY7AAYmAAO4ACV26Fg3ma6DaHQgkLYVxhCUQAFo1hYxE4VKUJFoClNMd8EA5zHIGOLMlp1FZpZsKWBSOxkFBsMyOWymr4DsczjyLlD+X1BSVRVIxgpnhozCkXViNFJZM8tCr8YpJWIpDqGjI9QajSbfLAZMEuKQIABFZDsdDIQ6YXnRe03OGIV4IsSmLS+pRSbTpZxYtZyVLitZqhTSnLh8mR6OG40shNJlPpzPZ3MqSJ82IO24IOQvCzVoZSSUMfHqes1BdLTQFBQFUwRjBR-W9uMYBMARwz6AAhjwwOzfAEgqFqPRbZPrrCROIdDI3dY6gaHkzhfMU+I5P+ejvEo9ymEih7oMeMZ9qaMjJlemZ3g+5okBQb55tC05FiUQwyNIOifA4FZllIG4FORe4epoKwVpYbjAvqHTwFE2yXFOhY-ggQoKCoYoSlKMqTEMWJKKkZhONJK5iKJiGUtSdJMv2-Ffo61YyAwhlGcZRlqD6NgWGYtgBmY1ZyGpPaxtpdoCd+iRhlipgSBIiLQcoEg4hI8ESA5J5OWhg5pte2Y6QKM7BvWmQ+VopRKCW1bal2R6Oah8YyJht73rFxFCdKsg5IZDgMK8OiSvW9iyAFliNqlkhtqFKFnqy6GkAV2HFYJiRvGJwEepkcr2BU9XaPImhLEFSzAZ2bhAA */
		predictableActionArguments: true,
		id: "user",
		description: docDescription,
		context: {
			helperCount: 0,
			helpersOnline: 0,
			lastError: "",
			helpers: new Map<string, Helper>()
		},
		/* Keep track of helpers coming and going if not caught elsewhere */
		on: {
			createHelper: [
				{
					cond: "isValidNewHelper",
					actions: "createHelper"
				},
				{
					actions: "newHelperInvalid"
				}
			],
			helperInSync: {
				actions: "addInSync",
				cond: "isValidOnlineHelperEvent"
			},
			helperOutOfSync: {
				actions: "removeInSync",
				cond: "isValidOfflineHelperEvent"
			},
			helperAccepted: {
				actions: "addHelper",
				cond: "isValidAddHelperEvent"
			},
			helperRemoved: {
				actions: "removeHelper",
				cond: "isValidRemoveHelperEvent"
			},
			"*": {
				actions: log(statusLogger)
			}
		},
		initial: "tooFewHelpers",
		states: {
			tooFewHelpers: {
				on: {
					helperAccepted: {
						actions: "addHelper",
						cond: "isEnoughHelpers",
						target: "enoughHelpers"
					}
				}
			},
			enoughHelpers: {
				on: {
					helperRemoved: {
						actions: "removeHelper",
						cond: "isTooFewHelpers",
						target: "tooFewHelpers"
					}
				},
				initial: "findQuorum",
				states: {
					findQuorum: {
						description: "Pass through state",
						always: [{ target: "quorate", cond: "isStaticQuorum" }, { target: "inquorate" }]
					},
					quorate: {
						description: "Enough helpers online",
						on: {
							helperOutOfSync: {
								actions: "removeInSync",
								cond: "isNotQuorum",
								target: "inquorate"
							}
						}
					},
					inquorate: {
						description: "Insufficient helpers online",
						on: {
							helperInSync: {
								actions: "addInSync",
								cond: "isQuorum",
								target: "quorate"
							}
						}
					}
				}
			}
		}
	},
	{
		guards: {
			isValidNewHelper,
			isEnoughHelpers,
			isTooFewHelpers,
			isValidAddHelperEvent,
			isValidRemoveHelperEvent,
			isQuorum,
			isNotQuorum,
			isStaticQuorum,
			isValidOnlineHelperEvent,
			isValidOfflineHelperEvent
		},
		actions: {
			/* bad, helpers is meant to be immutable, should be cloned */
			createHelper: assign({
				helpers: (context, event) => context.helpers.set(event.helperId.toLowerCase(), new Helper(context.helpers.size))
			}),

			addHelper: assign({
				helpers: (context, event) => {
					const helper = context.helpers.get(event.helperId.toLowerCase());
					if (helper && !helper.helperAccepted) {
						helper.helperAccepted = true;
						return context.helpers;
					}
					console.error("Adding helper in an inconsistent state");
					return context.helpers;
				},
				helperCount: countHelpers
			}),

			removeHelper: assign({
				helpers: (context, event) => {
					const helper = context.helpers.get(event.helperId.toLowerCase());
					if (helper && helper.helperAccepted) {
						helper.helperAccepted = false;
						helper.helperOnline = false;
						return context.helpers;
					}
					console.error("Removing helper in an inconsistent state");
					return context.helpers;
				},
				helperCount: countHelpers
			}),

			addInSync: assign({
				helpers: (context, event) => {
					const helper = context.helpers.get(event.helperId.toLowerCase());
					if (helper && helper.helperAccepted && !helper.helperOnline) {
						helper.helperOnline = true;
						return context.helpers;
					}
					console.error("Setting InSync helper in an inconsistent state");
					return context.helpers;
				},
				helpersOnline: countOnline
			}),

			removeInSync: assign({
				helpers: (context, event) => {
					const helper = context.helpers.get(event.helperId.toLowerCase());
					if (helper && helper.helperAccepted && helper.helperOnline) {
						helper.helperOnline = false;
						return context.helpers;
					}
					console.error("Setting lost sync helper in an inconsistent state");
					return context.helpers;
				},
				helpersOnline: countOnline
			}),

			newHelperInvalid: (context, event) => console.error(`Helper "${event.helperId}" is not a valid id or already exists`)
		}
	}
);
