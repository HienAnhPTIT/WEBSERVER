
const chart = Highcharts.chart("container", {
    chart: {
        zoomType: 'xy'
    },
    title: {
        text: 'Average hourly Temperature, Humidity and brightness in PTIT',
        align: 'left'
    },
    subtitle: {
        text: 'Source: ' +
            '<a href="https://www.yr.no/nb/historikk/graf/5-97251/Norge/Troms%20og%20Finnmark/Karasjok/Karasjok?q=2021"' +
            'target="_blank">YR</a>'
    },
    xAxis: [{
        categories: [],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value}°C',
            style: {
                color: Highcharts.getOptions().colors[1]
            }
        },
        title: {
            text: 'Temperature',
            style: {
                color: Highcharts.getOptions().colors[1]
            }
        }
    }, { // Secondary yAxis
        title: {
            text: 'Humidity + Brightness',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        labels: {
            format: '{value} %',
            style: {
                color: Highcharts.getOptions().colors[0]
            }
        },
        opposite: true
    }],
    tooltip: {
        shared: true
    },
    legend: {
        align: 'left',
        x: 80,
        verticalAlign: 'top',
        y: 80,
        floating: true,
        backgroundColor:
            Highcharts.defaultOptions.legend.backgroundColor || // theme
            'rgba(255,255,255,0.25)'
    },

    series: [
        {
            name: "Temperature",
            type: 'column',

            // data: [
            //   43, 48, 65, 81, 11, 14, 17, 16, 15,
            //   16, 15,
            // ],
            // data: arrayN
            tooltip: {
                valueSuffix: '°C'
            }
        },
        {
            name: "Humidity",
            type: 'spline',
            yAxis: 1,
            // data: [24, 37, 29, 29, 32, 30,
            //   38, 36, 33, 34, 31]
            // data: arrayN,
            tooltip: {
                valueSuffix: ' %'
            }
        },
        {
            name: "Brightness",
            type: 'spline',
            // data: [
            //   11, 30, 16, 19, 20, 24, 32, 30, 29, 29,
            //   25,
            // ],
            tooltip: {
                valueSuffix: ' %'
            }
        },
        {
            name: "Dust",
            type: 'spline',
            // data: [
            //   11, 30, 16, 19, 20, 24, 32, 30, 29, 29,
            //   25,
            // ],
            tooltip: {
                valueSuffix: ' %'
            }
        },
    ],

    responsive: {
        rules: [
            {
                condition: {
                    maxWidth: 500,
                },
                chartOptions: {
                    legend: {
                        layout: "horizontal",
                        align: "center",
                        verticalAlign: "bottom",
                    },
                },
            },
        ],
    },
});

export function redrawChart(dataT, dataH, dataL, dataD) {
    console.log(dataT);
    chart.series[0].setData(dataT);
    chart.series[1].setData(dataH);
    chart.series[2].setData(dataL);
    chart.series[3].setData(dataD);
    // console.log();
}


let array1 = [];
let array2 = [];
let array3 = [];
let array4 = [];


function resetArray() {
    array1 = [];
    array2 = [];
    array3 = [];
    array4 = [];
}

let oldNode = 0;
function getdataForDiagram() {
    let number = $("#selectedNode").val();
    //alert("Chon node: "+ number);
    if(oldNode == 0) {
        oldNode = number;
    } else {
        if(oldNode != number) {
            //reset array de ve lai
            resetArray();
            redrawChart(array1, array2, array3, array4);
        }
        oldNode = number;
    }
    if(number != 1 && number != 2) {
        //alert("CHưa chon node");
        return;
    }
    
    
    $.ajax({
        type: 'GET',
        url: 'getData',
        data: { node: number },
        dataType: 'json',
        success: function (data) {
            if (data.length == 0) {
                alert("Khong co du lieu");
            }
            $.each(data, function (index, element) {
       
                //?//

                //function timechange() {
                    if (array1.length <= 10) {
                        array1.push(element.temp);
                    } else {
                        array1.splice(0, 1);
                        array1.push(element.temp);
                    };
                    if (array2.length <= 10) {
                        array2.push(element.humid);
                    } else {
                        array2.splice(0, 1);
                        array2.push(element.humid);
                    };
                    if (array3.length <= 10) {
                        array3.push(element.light);
                    } else {
                        array3.splice(0, 1);
                        array3.push(element.light);
                    };
                    if (array4.length <= 10) {
                        array4.push(element.dust);
                    } else {
                        array4.splice(0, 1);
                        array4.push(element.dust);
                    }
                    //console.log(array1);
                //}
                //?//
            });
        },
        error: function (data) {
            console.log("1111");
            console.log(data);
        }
    });

    redrawChart(array1, array2, array3, array4);
}
//let node = $("#node").html();
getdataForDiagram();
setInterval(getdataForDiagram, 2000);
    //setInterval(timechange, 2000);
    //redrawChart(array1, array2, array3, array4)