export default function getFormatDate(date: Date) {
    var year = date.getFullYear();
    var month = Number(1 + date.getMonth());
    month = Number(month >= 10 ? month : '0' + month);
    let variableMonth = month.toString();
    if (Number(variableMonth) < 10 && variableMonth.length == 1) {
        variableMonth = '0' + variableMonth;
    }
    var day = Number(date.getDate());
    day = Number(day >= 10 ? day : '0' + day);
    let variableDate = day.toString();
    if (Number(variableDate) < 10 && variableDate.length == 1) {
        variableDate = '0' + variableDate;
    }
    return String(year) + '-' + variableMonth + '-' + variableDate;
}
