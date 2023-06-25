import "./styles.css";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { createMachine, actions, assign } from "xstate";
import { useMachine } from "@xstate/react";
const { log } = actions;

const minQuorum = (context) => {
	return Math.ceil(context.helperCount / 2);
};

function validHelperOnlineEvent(context, event, currentlyActive) {
	const helper = context.helpers.get(event.helperId.toLowerCase());
	if (helper) {
		return helper.helperAccepted && helper.helperOnline === currentlyActive;
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

const minHelpers = 3;

function validHelperAcceptEvent(context, event, currentlyActive) {
	const helper = context.helpers.get(event.helperId.toLowerCase());
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

const machine = createMachine(
	{
		/** @xstate-layout N4IgpgJg5mDOIC5QFdZgE4GIAWYA2ADhgJIB2AygJ6kDGA2gAwC6ioBA9rAJYAuX7pViAAeiAKwAOACwA6AEwA2MZICMUsQHYAzArliANCEriVAThlSJGhRokqJurSo0BfF4dQYc+IugDyyDx+AGZUtIwsSCAc3HwCQqIIGqYaMqYKDClqGmJyclqmhsYIYmYWVjZ2DvnObh5oWLiEGACCEBCQEUIxvPyCUYlaVjK2ppq6pgwF40Um5pbWYplScioFWnUgno0+GABKYAC27ABunczdnL3xA4j25tkOCqZyUgxKEgZGc+XWtvaOWruLYNTAAKi6UR6cX6oEGchkKlW72UK1ykgksxKDFS1hUDE+ijydg0rmB2xkPHY7AAYmAAO4ACV26Fg3ma6DaHQgkLYVxhCUQAFo1hYxE4VKUJFoClNMd8EA5zHIGOLMlp1FZpZsKWBSOxkFBsMyOWymr4DsczjyLlD+X1BSVRVIxgpnhozCkXViNFJZM8tCr8YpJWIpDqGjI9QajSbfLAZMEuKQIABFZDsdDIQ6YXnRe03OGIV4IsSmLS+pRSbTpZxYtZyVLitZqhTSnLh8mR6OG40shNJlPpzPZ3MqSJ82IO24IOQvCzVoZSSUMfHqes1BdLTQFBQFUwRjBR-W9uMYBMARwz6AAhjwwOzfAEgqFqPRbZPrrCROIdDI3dY6gaHkzhfMU+I5P+ejvEo9ymEih7oMeMZ9qaMjJlemZ3g+5okBQb55tC05FiUQwyNIOifA4FZllIG4FORe4epoKwVpYbjAvqHTwFE2yXFOhY-ggQoKCoYoSlKMqTEMWJKKkZhONJK5iKJiGUtSdJMv2-Ffo61YyAwhlGcZRlqD6NgWGYtgBmY1ZyGpPaxtpdoCd+iRhlipgSBIiLQcoEg4hI8ESA5J5OWhg5pte2Y6QKM7BvWmQ+VopRKCW1bal2R6Oah8YyJht73rFxFCdKsg5IZDgMK8OiSvW9iyAFliNqlkhtqFKFnqy6GkAV2HFYJiRvGJwEepkcr2BU9XaPImhLEFSzAZ2bhAA */
		predictableActionArguments: true,
		id: "user",
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
						always: [{ target: "quorate", cond: "isStaticQuorum" }, { target: "inquorate" }]
					},
					quorate: {
						on: {
							helperOutOfSync: {
								actions: "removeInSync",
								cond: "isNotQuorum",
								target: "inquorate"
							}
						}
					},
					inquorate: {
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

			newHelperInvalid: log((_, event) => `Helper "${event.helperId}" is not a valid id or already exists`)
		}
	}
);

function App() {
	const [current, send] = useMachine(machine);
	const { helperCount, helpersOnline, helpers } = current.context;

	/**
	 * log an event for sending and send it
	 * @param eventType helperAdded etc.
	 * @param helperId the id of the helper
	 */
	function logAndSend(eventType, helperId) {
		let event = { type: `${eventType}`, helperId: `${helperId}` };
		console.log(event);
		send(event);
		console.table(current.context.helpers);
	}

	/**
	 * toggle the accepted state of a helper
	 * @param helperId helper
	 * @param accepted true if they are currently accepted
	 */
	function toggleHelperAccepted(helperId, accepted) {
		return () => logAndSend(accepted ? "helperRemoved" : "helperAccepted", helperId);
	}
	/**
	 * toggle he online state of a helper
	 * @param helperId helper
	 * @param accepted true if they are currently accepted
	 * @param online true if they are currently online
	 */
	function toggleHelperOnline(helperId, accepted, online) {
		return () => logAndSend(online ? "helperOutOfSync" : "helperInSync", helperId);
	}

	/**
	 * Returns a string containing state name in dotted notation
	 */
	function currentStateName() {
		return current.toStrings().slice(-1)[0];
	}
	/**
	 * get a color indicative of the current state
	 * @param state the current state
	 */
	function colorForState() {
		if (currentStateName()?.includes("tooFewHelpers")) return "red";
		if (currentStateName()?.includes(".quorate")) return "green";
		return "orange";
	}
	/**
	 * Draw some buttons for toggling helper state
	 * @param helperId helper
	 * @param accepted true if they are currenlt accepted
	 * @param online true if they are currently online
	 */
	function buttons(helperId, accepted, online) {
		return (
			<span>
				<strong>{helperId}</strong> Accepted {accepted ? "✅" : "❌"}{" "}
				<button onClick={toggleHelperAccepted(helperId, accepted)}> Toggle</button> Online {online ? "✅" : "❌"}{" "}
				<button disabled={!accepted} onClick={toggleHelperOnline(helperId, accepted, online)}>
					Toggle
				</button>{" "}
			</span>
		);
	}

	return (
		<div className="App">
			{/* keep the way I wrote it, don't want messed around , flwg div is only there so the rest
      of the JSX doesn't get messed with see https://prettier.io/docs/en/ignore.html */}
			{/* prettier-ignore */}
			<div>
			<h1>DeRec StateChart Demo</h1>
			<p>This is running the State Chart below:</p>
			<iframe title="State Chart" width="750em" height="750em" src="https://stately.ai/registry/editor/embed/fc70b0ef-71b1-42d7-94ab-3d6266e9c872?machineId=ccba11f9-9e72-4152-a9b7-f95ed842f49c&mode=Design"/>
			<div id="entry">
				<label htmlFor="events">Event: </label>
				<select name="events" id="events">
					<option value="createHelper">createHelper</option>
					<option value="helperAccepted">helperAccepted</option>
					<option value="helperRemoved">helperRemoved</option>
					<option value="helperInSync">helperInSync</option>
					<option value="helperOutOfSync">helperOutOfSync</option>
				</select>
				&nbsp;
				<label htmlFor="helperId">Helper Id: </label>
				<input type="text" id="helperId" name="helperId" placeholder="helperId" />
				&nbsp;
				<button
					onClick={() => {
						/* TODO: yes, yes, I know you are really not supposed to access the DOM in React */
						logAndSend(document.getElementById("events").value, document.getElementById("helperId").value);
						//document.getElementById("helperId").value = "";
					}}>
					Send Event
				</button>
			</div>

			<p />
			<code>
				&nbsp;Last State: {current.history?.toStrings().slice(-1)}
				&nbsp; Last Event: {current.event.type} {current.event.helperId}
				<h3>
					Current State: <strong className={colorForState()}>{currentStateName()}</strong>
				</h3>
				<h3>
					Current Helpers - MinHelpers: {minHelpers}, Accepted: <strong>{helperCount}</strong>, Quorum:{" "}
					{minQuorum(current.context)}, Online: <strong>{helpersOnline}</strong>
				</h3>
				{Array.from(helpers).map(([name, value]) => (
					<li key={value.helperId}>{buttons(name, value.helperAccepted, value.helperOnline)}</li>
				))}
			</code>
		</div>
		</div>
	);
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<App />);
