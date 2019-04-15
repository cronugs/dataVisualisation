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

    //The salary data is not rendering because it is being treated as a string. We need to loop over it and converty the values to int.
    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d["yrs.service"]);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
    })

    //call the discipline selector
    show_discipline_selector(ndx);

    //*out of step* - create a function to calculate the % of men and women professors
    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-proffessors");
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-proffessors");

    //we pass the ndx crossfilter data to the function that is going to draw the graph. We can call this anything. show_gender_balance
    //and we pass in ndx (our crossfilter data).
    show_gender_balance(ndx);

    //call the show_average_salaries and rank distribution functions, again passing in the crossfilter data (ndx).
    show_average_salaries(ndx);

    show_rank_distribution(ndx);

    //*out of step* - function call to display years of service to salary correlation.
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

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

function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProffessors = ndx.groupAll().reduce(
        function (p, v) {
            if (v.sex === gender) {
                p.count++;
                if (v.rank === "Prof") {
                    p.are_prof++;
                }
            }
            return p;
        },
        function (p, v) {
            if (v.sex === gender) {
                p.count--;
                if (v.rank === "Prof") {
                    p.are_prof--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, are_prof: 0};
        }
    )

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if(d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProffessors);
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
        //a valueAccessor to specify which of those values gets plotted. We want the average. We use toFixed(2) to limit to 2 decimals
        .valueAccessor(function(d) {
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}

function show_rank_distribution(ndx) {
    //pluck our dimension and put it in dim
    
    //make a group
    /* var profByGender = dim.group().reduce(
        //here p is the accumulator to keep track of the number of values. v is the individual values being added
        function(p, v) {
            //so in total we will always increment
            p.total++;
            //but we will only increment match is the rank of the data is professor
            if(v.rank == "Prof") {
                p.match++;
            }
            return p;
        },
        //the remove function also takes p and v
        function(p, v) {
            //remove being the opposite, we will allways decrement our total.
            p.total--;
            //we will only decrement match if the rank matches "Prof"
            if(v.rank == "Prof") {
                p.match--;
            }
            return p;
        },
        //the initialise function takes no argument, it creates the data structure that will be threaded through the calls to add and 
        //remove items.
        //our initialise functions data structure will contain total; will be a count of the number of rows we are dealing with.
        //match will be a count of how many of those rows are professsors.
        function () {
            return {total: 0, match: 0};
        }      
    ); */

    //We could do the same thing for each rank, and basically use the same code; call reduce() and write two more reduce functions. But
    //given that the code is so similar, there is probably a better way to deal with it. Instead of duplicating all that code, we will
    //create a function here called rankByGender, where we pass in a dimension and we pass in the rank we are interested in using for 
    //the reduse. We will call this function for each rank, Prof, asstProf, and assocProc. 

    //We will create the rankByGender method and use these three lines instead of duplicating the code above. We will code it in the 
    //show_rank_distribution function because it has no real relevance outside this function. It is a nested function.

    //rankByGender will take two argument; the dimension we are grouping on, and the rank we are looking for

    function rankByGender (dimension, rank) {
        //here we are taking the reduce function we created previously (now commented out above) and return it from this function. We 
        //generalise the function a bit by changing the references to "Prof" to the rank variable. We also change the dim being used 
        //by group to match the dimesion being passed in as an argument.
        return dimension.group().reduce(
            function(p, v) {
                p.total++;
                if(v.rank == rank) {
                    p.match++;
                }
                return p;
            },
            function(p, v) {
                p.total--;
                if(v.rank == rank) {
                    p.match--;
                }
                return p;
            },
            function () {
                return {total: 0, match: 0};
            }      
        );
    }
    
    var dim = ndx.dimension(dc.pluck('sex'));

    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");

    //now we create a stacked bar chart to display the data

    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        //first group
        .group(profByGender, "Prof")
        //followed by stacked groups
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        //we need to use a valueAccessor because we used a custom reducer for this chart.
        //The total value of the data structure is the total number of men or women found.
        //The match is the number of those that match a rank "prof" "asstProf" etc.
        //What we need to do for each value we are plotting is find what percentage of the total is the match. We do that by dividing
        //the match by the total and multiply by 100.

        //Note; We could have put this calculation into the custom reducer as a third property in the data structure created by the 
        //initialise function. 
        .valueAccessor(function (d) {
            if(d.value.total > 0) {
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        //we can use the margins of the chart to make room for the legend. notice the larger than usual right margin.
        .margins({top:10, right:100, bottom:30, left: 30});

}

function show_service_to_salary_correlation(ndx) {

    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["orange", "green"]);

    var eDim = ndx.dimension(dc.pluck("yrs_service"));
    var experienceDim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary, d.rank, d.sex];
    });
    var experienceSalaryGroup = experienceDim.group();

    var minExperience = eDim.bottom(1)[0].yrs_service;    
    var maxExperience = eDim.top(1)[0].yrs_service;

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years of Service")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function(d){
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left:75});
    

}

function show_phd_to_salary_correlation(ndx) {

    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["orange", "green"]);

    var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
    var phdDim = ndx.dimension(function(d) {
        return [d.yrs_since_phd, d.salary, d.rank, d.sex];
    });
    var phdSalaryGroup = phdDim.group();

    var minPhd = pDim.bottom(1)[0].yrs_since_phd;    
    var maxPhd = pDim.top(1)[0].yrs_since_phd;

    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd, maxPhd]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Since PhD")
        .title(function(d) {
            return d.key[2] + " earned " + d.key[1];
        })
        .colorAccessor(function(d){
            return d.key[3];
        })
        .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left:75});
    

}

