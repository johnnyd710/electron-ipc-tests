import { toMainTest, toUtilityTest } from "./tests.js";

document.getElementById("StartTests").addEventListener("click", startTests);

function setVal(id, value) {
    document.getElementById(id).innerHTML = value;
}

async function startTests() {
    await utilityTests();
    await mainTests();
}

async function utilityTests() {
    const iterations = +(document.getElementById("iterations").value);
    const measurements = await toUtilityTest(iterations);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    setVal("resultsUtilAvg", average.toFixed(2))
}

async function mainTests() {
    const iterations = +(document.getElementById("iterations").value);
    const measurements = await toMainTest(iterations);
    const average = (Array.from(measurements.values())
        .reduce((prev, curr) => prev + curr, 0))
        / measurements.size;
    setVal("resultsMainAvg", average.toFixed(2))
}
