export const UiHelpers = {
  setVal: (id, value) => {
    document.getElementById(id).innerHTML = value;
  },
  setLoading: (enabled) => {
    document.getElementById("StartTests").disabled = enabled;
    document.getElementById("loading").style.display = enabled
      ? "block"
      : "none";
  },
  clearUI: () => {
    UiHelpers.resetTable();
  },
  // getPayloadSize: () => +document.getElementById("payload").value,
  /**
   * @param s { { [key: string]: {} } }
   * @param id { string }
   */
  outputTable: (s, id) => {
    const cols = [];
    for (const k in s) {
      for (const c in s[k]) {
        if (cols.indexOf(c) === -1) cols.push(c);
      }
    }
    let html =
      "<thead><tr><th></th>" +
      cols.map((c) => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>";
    for (const l in s) {
      html +=
        "<tr><th>" +
        l +
        "</th>" +
        cols.map((c) => "<td>" + (s[l][c] || "") + "</td>").join("") +
        "</tr>";
    }
    html += "</tbody>";
    const table = document.createElement("table");
    table.id = `results-table-${id}`;
    table.innerHTML = html;
    document.body.appendChild(table);
  },
  resetTable: () => {
    document.querySelectorAll("table")?.forEach((t) => t.remove());
  },
};
