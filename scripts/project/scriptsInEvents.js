import { onBeforeProjectStart, playerShieldIncrement } from "./main.js"


const scriptsInEvents = {

	async EventSheet1_Event15_Act1(runtime, localVars)
	{
		onBeforeProjectStart(runtime)
	},

	async EventSheet2_Event15_Act1(runtime, localVars)
	{
		onBeforeProjectStart(runtime)
	},

	async EventSheet2_Event16(runtime, localVars)
	{
		
	},

	async Global_Event1_Act2(runtime, localVars)
	{
		playerShieldIncrement()
	},

	async EventSheet3_Event15_Act1(runtime, localVars)
	{
		onBeforeProjectStart(runtime)
	},

	async EventSheet3_Event16(runtime, localVars)
	{
		
	}

};

self.C3.ScriptsInEvents = scriptsInEvents;

