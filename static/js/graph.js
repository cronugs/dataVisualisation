queue()

//Defer takes two arguments. The first is the format, here specified as a scv by the d3.csv argument. The second is the path to the data.
    .defer(d3.csv, "data/Salaries.csv")
//The await method takes one argument, the name of the funtion we want to call once the data has loaded
    .await(makeGraphs);

//Then we create the function makeGraphs for .await to call.
//makeGraphs will take two args, error and salaryData. salaryData is the variable that the csv data gets passed into by queue.js. This
//is how we will access out data.
function makeGraphs(error, salaryData) {
    
    //we pass our salaryData into crossfilter and call it ndx. 
    var ndx = crossfilter(salaryData);

    //call the discipline selector
    show_discipline_selector(ndx);

    //we pass the ndx crossfilter data to the function that is going to draw the graph. We can call this anything. show_gender_balance
    //and we pass in ndx (our crossfilter data).
    show_gender_balance(ndx);

    //call the show_average_salaries function again passing out crossfilter data in (ndx).
    show_average_salaries(ndx);

    //call the dc function to render charts
    dc.renderAll();
}

//Here will will create a discipline selector function that will recieve the crossfilter data in ndx. We will call it from the
//makeGraphs function
function show_discipline_selector(ndx) {
    //select menus just need a dimension and a group
    //To create the dimension we will pluck the disciple column from the crossfilter data
    dim = ndx.dimension(dc.pluck('discipline'));
    //turn the dimension into a group
    group = dim.group()
    //bind the select menu to the div it will render in
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);

}

//Now we write the function that will draw the graph. Each graph will have its own function.

function show_gender_balance(ndx) {
    //inside this function we concentrate on a single graph. 

    //first we pluck the dimension of data we want. This time we are selecting the sex column. we store it in the dim variable.
    var dim = ndx.dimension(dc.pluck('sex'));
    //next we take the data in the dim variable and make it into a group() called group.
    var group = dim.group();

    //Then we use a dc bar chart provided by dc.js and we link it to our gender-balance div.
    dc.barChart("#gender-balance")
        //and we set the properties and attributes.
        .width(400)
        .height(300)
        .margins({top:10, right:50, bottom:30, left:50})
        //here we specify which dimension/s to be included in the graph.
        .dimension(dim)
        //and the group greated from the dimension.
        .group(group)
        //The transitionDuration sets the speed of animations between filters
        .transitionDuration(500)
        //set the scale for the x axis. In this case, ordinal is used because it not a numeric scale but rather a description.
        .x(d3.scale.ordinal())
        //and set the units for the x axis as well
        .xUnits(dc.units.ordinal)
        // .elasticY(true) causes the axis to change rather than the bars... not desirable in this case
        //set the label for the x axit
        .xAxisLabel("Gender")
        //specify the number of ticks that should appear on the Y axit
        .yAxis().ticks(20);
}

function show_average_salaries(ndx) {
    //first pluck the dimension and put in in a group
    var dim = ndx.dimension(dc.pluck('sex'));
    //The group need to be created using a custom reducer that will calulate the average salary for men and women.
    //in this case the group is called averageSalaryByGender
    
    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if(p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
        p.total -= v.salary;
        p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return {count: 0, total: 0, average: 0};
    }
    
    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);

    //now we create the graph for average salary by sex, attatching it to our div in the process
    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({top:10, right:50, bottom:30, left: 50})
        //The dimension is the dim we created earlier when we calculated average salary created by doing a pluck on the sex column so
        //the values for the dimension would be male and female. So our average saleries are then grouped by gender
        .dimension(dim)
        //The group is the averageSalaryByGender that we created using the custom reducer
        .group(averageSalaryByGender)
        //because we used a custom reducer we need to use a valueAccessor, because the value being plotted here is the value created in
        //the initialise function of our custom reducer. The value actually has a count a total and an average. So we need to write
        //a valueAccessor to specify which of those values gets plotted. We want the average.
        .valueAccessor(function(d) {
            return d.value.average;
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        xAxisLabel("Gender")
        yAxix().ticks(4);
}

