function classifyPartNumber(pn, incomingPN, outgoingPN) {
    
    // Condition 1: starts with 692 or 695 AND first digit of last 3 chars is 5
    const cond1 = 
        (pn.startsWith("692") || pn.startWith("695")) &&
        pn.slice(-3)[0]=="5";

    // Condotion 2: starts with 695 AND ends with 1 
    const cond2 = 
        pn.startsWith("695") &&
       pn.endsWith("1"); 

    // Condition 3: characters 7-9 (last 3 of first 9 chars) are 506 or 510
    const segment7to9 = pn.slice(0, 9).slice(-3);
    const cond3 =
        segment7to9 == "506" ||
        segment7to9 == "510";
    
    // Condition 4: incoming PN equals outgoing PN
    const cond4 = incomingPN == outgoingPN;

    // Final decision
    if (cond1 || cond2 || cond3 || cond4) {
        return "Refurbish";
    } else {
        return "Rework";
    }

}