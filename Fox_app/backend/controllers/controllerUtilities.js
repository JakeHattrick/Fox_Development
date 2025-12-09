//uuidRegex to validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

//function for creating set clauses
//GIVEN:   allowed (string array), req (request object)
//RETURNS: setClauses (array), values (array), paramIndex (index number)
function dynamicQuery(allowed, req) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    for (const col of allowed) {//iterate over allowed fields
                if (Object.prototype.hasOwnProperty.call(req.body, col)) {//check if field is provided
                    setClauses.push(`${col} = $${paramIndex}`);//add to SET clause
                    values.push(req.body[col]);//add value
                    paramIndex++;//increment parameter index
                }
            }
    return { setClauses, values, paramIndex };
 }
 
function dynamicPostQuery(allowed, req) {
    const columns = []; //columns to insert into
    const placeholders = []; //placeholders for parameterized query
    const values = []; //values for parameterized query
    let paramIndex = 1;

    //build query dynamically based on provided fields
    for (const col of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, col)) { //check if field is provided
            placeholders.push(`$${paramIndex}`); //add placeholder
            values.push(req.body[col]); //add value
            columns.push(col); //add column name
            paramIndex++; //increment parameter index
            }
        }
    return { columns, placeholders, values };
}
module.exports = { uuidRegex, dynamicQuery, dynamicPostQuery };