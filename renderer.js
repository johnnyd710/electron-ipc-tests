import { toMainTest, toUtilityTest } from "./tests.js";

document.getElementById("StartTests").addEventListener("click", startTests);

function setVal(id, value) {
    document.getElementById(id).innerHTML = value;
}

async function startTests() {
    setVal("resultsUtilAvg", 0);
    setVal("resultsMainAvg", 0);
    document.getElementById("StartTests").disabled = true;
    await utilityTests();
    await mainTests();
    document.getElementById("StartTests").disabled = false;
}

async function utilityTests() {
    const iterations = +(document.getElementById("iterations").value);
    const pSize = +(document.getElementById("payload").value);
    const measurements = await toUtilityTest(iterations, pSize);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    setVal("resultsUtilAvg", average.toFixed(2))
}

async function mainTests() {
    const iterations = +(document.getElementById("iterations").value);
    const pSize = +(document.getElementById("payload").value);
    const measurements = await toMainTest(iterations, pSize);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    setVal("resultsMainAvg", average.toFixed(2))
}
