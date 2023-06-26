/* Copyright (c) 2023 The Building Blocks Limited. All rights reserved. */
import "./styles.css";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { useMachine } from "@xstate/react";
import {deRecUserMachine, minHelpers, minQuorum} from "./deRecUserMachine"


function App() {
	const [current, send] = useMachine(deRecUserMachine);
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
			<iframe title="State Chart" width="750em" height="750em" src="https://stately.ai/registry/editor/embed/fc70b0ef-71b1-42d7-94ab-3d6266e9c872?mode=Design&machineId=240d33a9-c6c9-4e44-b615-e034d2f281c0"/>
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
