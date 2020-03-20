//debugger

odoo.define('web.GraphOwlRenderer', function (require) {
    'use strict';

    //debugger
    const OwlAbstractRenderer = require('web.AbstractRendererOwl');
    var dataComparisonUtils = require('web.dataComparisonUtils');
    var config = require('web.config');
    var DateClasses = dataComparisonUtils.DateClasses;
    var fieldUtils = require('web.field_utils');
    var core = require('web.core');
    var _t = core._t;

    var NO_DATA = [_t('No data')];
    NO_DATA.isNoData = true;
    var CHART_TYPES = ['pie', 'bar', 'line'];

    var COLORS = ["#1f77b4", "#ff7f0e", "#aec7e8", "#ffbb78", "#2ca02c", "#98df8a", "#d62728",
        "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2",
        "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];
    var COLOR_NB = COLORS.length;

    function hexToRGBA(hex, opacity) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        var rgb = result.slice(1, 4).map(function (n) {
            return parseInt(n, 16);
        }).join(',');
        return 'rgba(' + rgb + ',' + opacity + ')';
    }

    // used to format values in tooltips and yAxes.
    var FORMAT_OPTIONS = {
        // allow to decide if utils.human_number should be used
        humanReadable: function (value) {
            return Math.abs(value) >= 1000;
        },
        // with the choices below, 1236 is represented by 1.24k
        minDigits: 1,
        decimals: 2,
        // avoid comma separators for thousands in numbers when human_number is used
        formatterCallback: function (str) {
            return str;
        },
    };

    // hide top legend when too many items for device size
    var MAX_LEGEND_LENGTH = 4 * (Math.max(1, config.device.size_class));

    const { useState, useRef } = owl.hooks;

    class GraphOwlRenderer extends OwlAbstractRenderer {
        canvasRef = useRef("chart-canvas");
        tooltipRef = useRef("chart-tooltip");

  //      static components = { GraphOwlTooltip };
        //debugger;
        constructor() {
            console.log("constructor");
            //debugger;
            super(...arguments);
            this.state = useState({
                noContentHelper: {
                    show: false,
                    title: '',
                    message: ''
                },
                tooltip: {
                    measure: '',
                    items: [],
                    maxWidth: '',
                    style: "visibility: hidden",
                    model: undefined
                },
                chartStyle: "position: relative"});
            //this.canvasRef = useRef("chart-canvas");
            this.$tooltip = null;
            this.chart = null;
            this.fields = arguments[0].props.fields || {}; // TODO
            this.isEmbedded = arguments[0].props.isEmbedded || false;
            this.title = arguments[0].props.title || '';

            this.tooltipMeasure = 1;
            this.tooltipItems = [];
            this.tooltipMaxWidth = 0;
            //this.tooltipVisible = true;
            this.tooltipStyle = "style='display:none'";
            this.graphGroupBy = [];
            this.toRender = false;
        }

        mounted() {
            console.log("mounted");
            this.graphGroupBy = [...this.props.groupBy];

            if (!this.props.isEmbedded)
                this.state.chartStyle = "position: absolute"

            this._renderChart();
        }

        async willStart() {
            console.log("willstart");
        }

        async willUpdateProps(nextProps) {
            console.log("willUpdateProps", nextProps);
            if (!nextProps.isEmbedded)
                this.state.chartStyle = "position: absolute"

            this.toRender = false;
            //debugger;
            // Cannot compare to nextProps.groupBy to this.props.groupBy because the latter already contains the modified
            // values. It's done by reference
            if (this.graphGroupBy != nextProps.groupBy ||
            this.props.measure != nextProps.measure ||
            this.props.mode != nextProps.mode) {
                this.graphGroupBy = [...this.props.groupBy]
                this.toRender = true;
            }
        }

        willPatch() {
            console.log("will patch");
            //debugger;
            //this._renderChart();
            if (this.toRender) {
                this._resetNoContentHelper();
                this._renderChart();
                this.toRender = false;
            }




        }

        patched() {
            console.log("patched");
            debugger;
            if (this.tooltipRef.el.style.visibility != 'hidden')
            {
                const chartArea = this.chart.chartArea;
                const chartAreaLeft = chartArea.left;
                const chartAreaRight = chartArea.right;
                const chartAreaTop = chartArea.top;
                const rendererTop = this.el.getBoundingClientRect().top;
                const maxTooltipLabelWidth = Math.floor((chartAreaRight - chartAreaLeft) / 1.68) + 'px';
                this.state.tooltip.maxWidth = maxTooltipLabelWidth;
                let top;
                const tooltipHeight = this.tooltipRef.el.clientHeight;
                //debugger;
                const minTopAllowed = Math.floor(chartAreaTop);
                const maxTopAllowed = Math.floor(window.innerHeight - rendererTop - tooltipHeight) - 2;
                const y = Math.floor(this.state.tooltip.model.y);

                if (minTopAllowed <= maxTopAllowed) {
                    // Here we know that the full tooltip can fit in the screen.
                    // We put it in the position where Chart.js would put it
                    // if two conditions are respected:
                    //  1: the tooltip is not cut (because we know it is possible to not cut it)
                    //  2: the tooltip does not hide the legend.
                    // If it is not possible to use the Chart.js proposition (y)
                    // we use the best approximated value.
                    if (y <= maxTopAllowed) {
                        if (y >= minTopAllowed) {
                            top = y;
                        } else {
                            top = minTopAllowed;
                        }
                    } else {
                        top = maxTopAllowed;
                    }
                } else {
                    // Here we know that we cannot satisfy condition 1 above,
                    // so we position the tooltip at the minimal position and
                    // cut it the minimum possible.
                    top = minTopAllowed;
                    const maxTooltipHeight = window.innerHeight - (rendererTop + chartAreaTop) -2;
                    this._adjustTooltipHeight(maxTooltipHeight);
                }
                //this.tooltipRef.el.style.top = Math.floor(top) + 'px';
                //debugger;

                this.tooltipRef.el.style["top"] = Math.floor(top) + "px";
                //this.state.tooltip.style += ";top:" + Math.floor(top) + "px";
                this._fixTooltipLeftPosition(this.tooltipRef.el, this.state.tooltip.model.x);
            }

        }

        _resetNoContentHelper() {
        /*
            this.state.noContentHelper = {
                    show: false,
                    title: '',
                    message: ''
                };*/
            this.state.noContentHelper.show = false;
            this.state.noContentHelper.title = '';
            this.state.noContentHelper.message = '';
        }

        _renderChart() {
            console.log("render chart")
            //debugger;
            if (this.chart) {
                this.chart.destroy();
            }

            var dataPoints = this._filterDataPoints();

            // TODO is this part still necessary???? shoudln't it be in renderLine and the other????
            if (!dataPoints.length && this.props.mode !== 'pie') {
                this.state.noContentHelper.show = true;
                //debugger;
                //this.$el.append(qweb.render('View.NoContentHelper'));
            }
            //var $canvasContainer = $('<div/>', {class: 'o_graph_canvas_container'});
            //var $canvas = $('<canvas/>').attr('id', this.chartId);
            //debugger;
            //this.canvasRef.el.id = this.chartId;

            //$canvasContainer.append($canvas);
            //this.$el.append($canvasContainer);

            var i = this.props.comparisonFieldIndex;
            if (i === 0) {
                this.dateClasses = this._getDateClasses(dataPoints);
            }
            //debugger;
            //if (this.props.mode )
            if (this.props.mode === 'bar') {
                this._renderBarChart(dataPoints);
            } else if (this.props.mode === 'line') {
                this._renderLineChart(dataPoints);
            } else if (this.props.mode === 'pie') {
                this._renderPieChart(dataPoints);
            }

            //return this._super.apply(this, arguments);
        }

         /**
         * create pie chart
         *
         * @private
         * @param {Object[]} dataPoints
         */
        _renderPieChart(dataPoints) {
            var self = this;

            // try to see if some pathologies are still present after the filtering
            var allNegative = true;
            var someNegative = false;
            var allZero = true;
            dataPoints.forEach(function (datapt) {
                allNegative = allNegative && (datapt.value < 0);
                someNegative = someNegative || (datapt.value < 0);
                allZero = allZero && (datapt.value === 0);
            });
            // TODO

            if (someNegative && !allNegative) {
                this.state.noContentHelper.title = _t("Invalid data")
                this.state.noContentHelper.message = _t("Pie chart cannot mix positive and negative numbers. ") +
                        _t("Try to change your domain to only display positive results");
                this.state.noContentHelper.show = true;
                /*this.$el.empty();
                this.$el.append(qweb.render('View.NoContentHelper', {
                    title: _t("Invalid data"),
                    description: _t("Pie chart cannot mix positive and negative numbers. " +
                        "Try to change your domain to only display positive results"),
                }));*/
                return;
            }
            if (allZero && !this.isEmbedded && this.props.origins.length === 1) {
                this.state.noContentHelper.title = _("Invalid data");
                this.state.noContentHelper.description = _t("Pie chart cannot display all zero numbers. ") +
                        _t("Try to change your domain to display positive results");
                this.state.noContentHelper.show = true;
                /*this.$el.empty();
                this.$el.append(qweb.render('View.NoContentHelper', {
                    title: _t("Invalid data"),
                    description: _t("Pie chart cannot display all zero numbers.. " +
                        "Try to change your domain to display positive results"),
                }));*/
                return;
            }

            // prepare data
            var data = {};
            var colors = [];
            if (allZero) {
                // add fake data to display a pie chart with a grey zone associated
                // with every origin
                data.labels = [NO_DATA];
                data.datasets = this.props.origins.map(function (origin) {
                    return {
                        label: origin,
                        data: [1],
                        backgroundColor: ['#d3d3d3'],
                    };
                });
            } else {
                data = this._prepareData(dataPoints);
                // give same color to same groups from different origins
                colors = data.labels.map(function (label, index) {
                    return self._getColor(index);
                });
                data.datasets.forEach(function (dataset) {
                    dataset.backgroundColor = colors;
                    dataset.borderColor = 'rgba(255,255,255,0.6)';
                });
                // make sure there is a zone associated with every origin
                var representedOriginIndexes = data.datasets.map(function (dataset) {
                    return dataset.originIndex;
                });
                var addNoDataToLegend = false;
                var fakeData = (new Array(data.labels.length)).concat([1]);
                this.props.origins.forEach(function (origin, originIndex) {
                    if (!_.contains(representedOriginIndexes, originIndex)) {
                        data.datasets.splice(originIndex, 0, {
                            label: origin,
                            data: fakeData,
                            backgroundColor: colors.concat(['#d3d3d3']),
                        });
                        addNoDataToLegend = true;
                    }
                });
                if (addNoDataToLegend) {
                    data.labels.push(NO_DATA);
                }
            }

            // prepare options
            var options = this._prepareOptions(data.datasets.length);

            // create chart
            var ctx = this.canvasRef.el;// document.getElementById(this.chartId);
            this.chart = new Chart(ctx, {
                type: 'pie',
                data: data,
                options: options,
            });
        }

       /**
         * create line chart.
         *
         * @private
         * @param {Object[]} dataPoints
         */
        _renderLineChart(dataPoints) {
            var self = this;

            // prepare data
            var data = this._prepareData(dataPoints);
            data.datasets.forEach(function (dataset, index) {
                if (self.props.processedGroupBy.length <= 1 && self.props.origins.length > 1) {
                    if (dataset.originIndex === 0) {
                        dataset.fill = 'origin';
                        dataset.backgroundColor = hexToRGBA(COLORS[0], 0.4);
                        dataset.borderColor = hexToRGBA(COLORS[0], 1);
                    } else if (dataset.originIndex === 1) {
                        dataset.borderColor = hexToRGBA(COLORS[1], 1);
                    } else {
                        dataset.borderColor = self._getColor(index);
                    }
                } else {
                    dataset.borderColor = self._getColor(index);
                }
                if (data.labels.length === 1) {
                    // shift of the real value to right. This is done to center the points in the chart
                    // See data.labels below in Chart parameters
                    dataset.data.unshift(undefined);
                }
                dataset.pointBackgroundColor = dataset.borderColor;
                dataset.pointBorderColor = 'rgba(0,0,0,0.2)';
            });
            if (data.datasets.length === 1) {
                const dataset = data.datasets[0];
                dataset.fill = 'origin';
                dataset.backgroundColor = hexToRGBA(COLORS[0], 0.4);
            }

            // center the points in the chart (without that code they are put on the left and the graph seems empty)
            data.labels = data.labels.length > 1 ?
                data.labels :
                Array.prototype.concat.apply([], [[['']], data.labels, [['']]]);

            // prepare options
            var options = this._prepareOptions(data.datasets.length);

            // create chart
            var ctx = this.canvasRef.el;
            this.chart = new Chart(ctx, {
                type: 'line',
                data: data,
                options: options,
            });
        }

        _renderBarChart(dataPoints) {
            var self = this;

            // prepare data
            var data = this._prepareData(dataPoints);

            data.datasets.forEach(function (dataset, index) {
                // used when stacked
                dataset.stack = self.props.stacked ? self.props.origins[dataset.originIndex] : undefined;
                // set dataset color
                var color = self._getColor(index);
                dataset.backgroundColor = color;
            });

            // prepare options
            var options = this._prepareOptions(data.datasets.length);

            // create chart
            var ctx =  this.canvasRef.el;
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options,
            });
        }

        /**
         * Return the first index of the array list where label can be found
         * or -1.
         *
         * @private
         * @param {Array[]} list
         * @param {Array} label
         * @returns {number}
         */
        _indexOf(list, label) {
            var index = -1;
            for (var j = 0; j < list.length; j++) {
                var otherLabel = list[j];
                if (label.length === otherLabel.length) {
                    var equal = true;
                    for (var i = 0; i < label.length; i++) {
                        if (label[i] !== otherLabel[i]) {
                            equal = false;
                        }
                    }
                    if (equal) {
                        index = j;
                        break;
                    }
                }
            }
            return index;
        }

        _getDatasetLabel(dataPt) {
            if (_.contains(['bar', 'line'], this.props.mode)) {
                // ([origin] + second to last groupBys) or measure
                var datasetLabel = dataPt.labels.slice(1).join("/");
                if (this.props.origins.length > 1) {
                    datasetLabel = this.props.origins[dataPt.originIndex] +
                        (datasetLabel ? ('/' + datasetLabel) : '');
                }
                datasetLabel = datasetLabel || this.fields[this.props.measure].string;
                return datasetLabel;
            }
            return this.props.origins[dataPt.originIndex];
        }

        _getDatasetDataLength(originIndex, defaultLength) {
            if (_.contains(['bar', 'line'], this.props.mode) && this.props.comparisonFieldIndex === 0) {
                return this.dateClasses.dateSets[originIndex].length;
            }
            return defaultLength;
        }

        _prepareData(dataPoints) {
            var self = this;

            var labels = dataPoints.reduce(
                function (acc, dataPt) {
                    var label = self._getLabel(dataPt);
                    var index = self._indexOf(acc, label);
                    if (index === -1) {
                        acc.push(label);
                    }
                    return acc;
                },
                []
            );

            var newDataset = function (datasetLabel, originIndex) {
                var data = new Array(self._getDatasetDataLength(originIndex, labels.length)).fill(0);
                return {
                    label: datasetLabel,
                    data: data,
                    originIndex: originIndex,
                };
            };

            // dataPoints --> datasets
            var datasets = _.values(dataPoints.reduce(
                function (acc, dataPt) {
                    var datasetLabel = self._getDatasetLabel(dataPt);
                    if (!(datasetLabel in acc)) {
                        acc[datasetLabel] = newDataset(datasetLabel, dataPt.originIndex);
                    }
                    var label = self._getLabel(dataPt);
                    var labelIndex = self._indexOf(labels, label);
                    acc[datasetLabel].data[labelIndex] = dataPt.value;
                    return acc;
                },
                {}
            ));

            // sort by origin
            datasets = datasets.sort(function (dataset1, dataset2) {
                return dataset1.originIndex - dataset2.originIndex;
            });

            return {
                datasets: datasets,
                labels: labels,
            };
        }

        _getLabel(dataPt) {
            var i = this.props.comparisonFieldIndex;
            if (_.contains(['bar', 'line'], this.props.mode)) {
                if (i === 0) {
                    return [this.dateClasses.dateClass(dataPt.originIndex, dataPt.labels[i])];
                } else {
                    return dataPt.labels.slice(0, 1);
                }
            } else if (i === 0) {
                return Array.prototype.concat.apply([], [
                            this.dateClasses.dateClass(dataPt.originIndex, dataPt.labels[i]),
                            dataPt.labels.slice(i+1)
                        ]);
            } else {
                return dataPt.labels;
            }
        }

        _filterDataPoints() {
            var dataPoints = [];
            if (_.contains(['bar', 'pie'], this.props.mode)) {
                dataPoints = this.props.dataPoints.filter(function (dataPt) {
                    return dataPt.count > 0;
                });
            } else if (this.props.mode === 'line') {
                var counts = 0;
                this.props.dataPoints.forEach(function (dataPt) {
                    if (dataPt.labels[0] !== _t("Undefined")) {
                        dataPoints.push(dataPt);
                    }
                    counts += dataPt.count;
                });
                // data points with zero count might have been created on purpose
                // we only remove them if there are no data point with positive count
                if (counts === 0) {
                    dataPoints = [];
                }
            }
            return dataPoints;
        }

        _getDateClasses(dataPoints) {
            //debugger;
            var self = this;
            var dateSets = this.props.origins.map(function () {
                return [];
            });
            dataPoints.forEach(function (dataPt) {
                dateSets[dataPt.originIndex].push(dataPt.labels[self.props.comparisonFieldIndex]);
            });
            dateSets = dateSets.map(function (dateSet) {
                return _.uniq(dateSet);
            });
            return new DateClasses(dateSets);
        }

        /**
         * Used any time we need a new color in our charts.
         *
         * @private
         * @param {number} index
         * @returns {string} a color in HEX format
         */
        _getColor(index) {
            return COLORS[index % COLOR_NB];
        }

        /**
         * Prepare options for the chart according to the current mode (= chart type).
         * This function returns the parameter options used to instantiate the chart
         *
         * @private
         * @param {number} datasetsCount
         * @returns {Object} the chart options used for the current mode
         */
        _prepareOptions(datasetsCount) {
            return {
                maintainAspectRatio: false,
                scales: this._getScaleOptions(),
                legend: this._getLegendOptions(datasetsCount),
                tooltips: this._getTooltipOptions(),
                elements: this._getElementOptions(),
            };
        }

        /**
         * Returns an object used to style chart elements independently from the datasets.
         *
         * @private
         * @returns {Object}
         */
        _getElementOptions() {
            var elementOptions = {};
            if (this.props.mode === 'bar') {
                elementOptions.rectangle = {borderWidth: 1};
            } else if (this.props.mode === 'line') {
                elementOptions.line = {
                    tension: 0,
                    fill: false,
                };
            }
            return elementOptions;
        }

        /**
         * Returns the options used to generate chart tooltips.
         *
         * @private
         * @returns {Object}
         */
        _getTooltipOptions() {
            var tooltipOptions = {
                // disable Chart.js tooltips
                enabled: false,
                custom: this._customTooltip.bind(this),
            };
            if (this.props.mode === 'line') {
                tooltipOptions.mode = 'index';
                tooltipOptions.intersect = false;
            }
            return tooltipOptions;
        }

        /**
         * This function creates a custom HTML tooltip.
         *
         * @private
         * @param {Object} tooltipModel see chartjs documentation
         */
        _customTooltip(tooltipModel) {
            //debugger;
            //this.tooltipRef.el.style.display = "none"
            this.state.tooltip.model = tooltipModel;
            this.state.tooltip.style = "visibility: hidden";
            if (tooltipModel.opacity === 0) {
                return;
            }
            if (tooltipModel.dataPoints.length === 0) {
                return;
            }
            this.state.tooltip.style = "visibility: visible";
            //this.tooltipRef.el.style.display = "visible"
            //debugger;

            //const chartArea = this.chart.chartArea;
            //const chartAreaLeft = chartArea.left;
            //const chartAreaRight = chartArea.right;
            //const chartAreaTop = chartArea.top;
            //const rendererTop = this.el.getBoundingClientRect().top;

            //const maxTooltipLabelWidth = Math.floor((chartAreaRight - chartAreaLeft) / 1.68) + 'px';
            debugger;
            const tooltipItems = this._getTooltipItems(tooltipModel);

            this.state.tooltip.measure = this.fields[this.props.measure].string;
            this.state.tooltip.items = tooltipItems;
            //this.state.tooltip.maxWidth = maxTooltipLabelWidth;

            //let top;
            //const tooltipHeight = this.tooltipRef.el.clientHeight;
            //const minTopAllowed = Math.floor(chartAreaTop);
            //const maxTopAllowed = Math.floor(window.innerHeight - rendererTop - tooltipHeight) - 2;
            //const y = Math.floor(tooltipModel.y);

            ///////////////////::TEST
            //top = minTopAllowed;
            //const maxTooltipHeight = window.innerHeight - (rendererTop + chartAreaTop) -2;
            //this._adjustTooltipHeight(maxTooltipHeight);
            ////////////////////
            /*
            if (minTopAllowed <= maxTopAllowed) {
                // Here we know that the full tooltip can fit in the screen.
                // We put it in the position where Chart.js would put it
                // if two conditions are respected:
                //  1: the tooltip is not cut (because we know it is possible to not cut it)
                //  2: the tooltip does not hide the legend.
                // If it is not possible to use the Chart.js proposition (y)
                // we use the best approximated value.
                if (y <= maxTopAllowed) {
                    if (y >= minTopAllowed) {
                        top = y;
                    } else {
                        top = minTopAllowed;
                    }
                } else {
                    top = maxTopAllowed;
                }
            } else {
                // Here we know that we cannot satisfy condition 1 above,
                // so we position the tooltip at the minimal position and
                // cut it the minimum possible.
                top = minTopAllowed;
                const maxTooltipHeight = window.innerHeight - (rendererTop + chartAreaTop) -2;
                this._adjustTooltipHeight(maxTooltipHeight);
            }
            //this.tooltipRef.el.style.top = Math.floor(top) + 'px';
            //debugger;
            this.state.tooltip.style += ";top:" + Math.floor(top) + "px";
            this._fixTooltipLeftPosition(this.tooltipRef.el, tooltipModel.x);*/
        }

        /**
         * Sets best left position of a tooltip approaching the proposal x
         *
         * @private
         * @param {DOMElement} tooltip
         * @param {number} x, left offset proposed
         */
        _fixTooltipLeftPosition(tooltip, x) {
            let left;
            const tooltipWidth = tooltip.clientWidth;
            const minLeftAllowed = Math.floor(this.chart.chartArea.left + 2);
            const maxLeftAllowed = Math.floor(this.chart.chartArea.right - tooltipWidth -2);
            x = Math.floor(x);
            if (x <= maxLeftAllowed) {
                if (x >= minLeftAllowed) {
                    left = x;
                } else {
                    left = minLeftAllowed;
                }
            } else {
                left = maxLeftAllowed;
            }
            //debugger;
            tooltip.style.left = left + 'px';
            //this.state.tooltip.style += ";left: " + left + "px";

        }

        /**
         * This function aims to remove a suitable number of lines from the tooltip in order to make it reasonably visible.
         * A message indicating the number of lines is added if necessary.
         *
         * @private
         * @param {Number} maxTooltipHeight this the max height in pixels of the tooltip
         */
        _adjustTooltipHeight(maxTooltipHeight) {
        // TODO
            // TODO optimize
            debugger;
            var sizeOneLine = this.tooltipRef.el.querySelector('tbody tr').clientHeight;
            var tbodySize = this.tooltipRef.el.querySelector('tbody').clientHeight;
            var toKeep = Math.floor((maxTooltipHeight - (this.tooltipRef.el.clientHeight - tbodySize)) / sizeOneLine) - 1;
            var lines = this.tooltipRef.el.querySelectorAll('tbody tr');
            var toRemove = lines.length - toKeep;
            if (toRemove > 0) {
                //lines.slice(toKeep).remove();
                for (let i = toKeep; i < lines.length; ++i) {
                    lines[i].remove();
                }

                var tr = document.createElement('tr');
                var td = document.createElement('td');
                tr.classList.add('o_show_more');
                td.innerHTML = _t("...");
                tr.appendChild(td);
                this.tooltipRef.el.querySelector('tbody').appendChild(tr);
            }


            //var clientHeight = this.tooltipRef.el.querySelector('tbody').clientHeight; // ------ 0
            //var tooltipLineRef = useRef("tooltip-line");
            /*
            var sizeOneLine = this.$tooltip.find('tbody tr')[0].clientHeight;
            var tbodySize = this.$tooltip.find('tbody')[0].clientHeight;
            var toKeep = Math.floor((maxTooltipHeight - (this.$tooltip[0].clientHeight - tbodySize)) / sizeOneLine) - 1;
            var $lines = this.$tooltip.find('tbody tr');
            var toRemove = $lines.length - toKeep;
            if (toRemove > 0) {
                $lines.slice(toKeep).remove();
                var tr = document.createElement('tr');
                var td = document.createElement('td');
                tr.classList.add('o_show_more');
                td.innerHTML = _t("...");
                tr.appendChild(td);
                this.$tooltip.find('tbody').append(tr);
            }*/
        }

        /**
         * Extracts the important information from a tooltipItem generated by Charts.js
         * (a tooltip item corresponds to a line (different from measure name) of a tooltip)
         *
         * @private
         * @param {Object} item
         * @param {Object} data
         * @returns {Object}
         */
        _getTooltipItemContent(item, data) {
            var dataset = data.datasets[item.datasetIndex];
            var label = data.labels[item.index];
            var value;
            var boxColor;
            if (this.props.mode === 'bar') {
                label = this._relabelling(label, dataset.originIndex);
                if (this.props.processedGroupBy.length > 1 || this.props.origins.length > 1) {
                    label = label + "/" + dataset.label;
                }
                value = this._formatValue(item.yLabel);
                boxColor = dataset.backgroundColor;
            } else if (this.props.mode === 'line') {
                label = this._relabelling(label, dataset.originIndex);
                if (this.props.processedGroupBy.length > 1 || this.props.origins.length > 1) {
                    label = label + "/" + dataset.label;
                }
                value = this._formatValue(item.yLabel);
                boxColor = dataset.borderColor;
            } else {
                if (label.isNoData) {
                    value = this._formatValue(0);
                } else {
                    value = this._formatValue(dataset.data[item.index]);
                }
                label = this._relabelling(label, dataset.originIndex);
                if (this.props.origins.length > 1) {
                    label = dataset.label + "/" + label;
                }
                boxColor = dataset.backgroundColor[item.index];
            }
            return {
                label: label,
                value: value,
                boxColor: boxColor,
            };
        }

        /**
         * This function extracts the information from the data points in tooltipModel.dataPoints
         * (corresponding to datapoints over a given label determined by the mouse position)
         * that will be displayed in a custom tooltip.
         *
         * @private
         * @param {Object} tooltipModel see chartjs documentation
         * @return {Object[]}
         */
        _getTooltipItems(tooltipModel) {
            var self = this;
            var data = this.chart.config.data;

            var orderedItems = tooltipModel.dataPoints.sort(function (dPt1, dPt2) {
                return dPt2.yLabel - dPt1.yLabel;
            });
            return orderedItems.reduce(
                function (acc, item) {
                    acc.push(self._getTooltipItemContent(item, data));
                    return acc;
                },
                []
            );
        }

        /**
         * Determine how to relabel a label according to a given origin.
         * The idea is that the getLabel function is in general not invertible but
         * it is when restricted to the set of dataPoints coming from a same origin.

         * @private
         * @param {Array} label
         * @param {Array} originIndex
         * @returns {string}
         */
        _relabelling(label, originIndex) {
            if (label.isNoData) {
                return label[0];
            }
            var i = this.props.comparisonFieldIndex;
            if (_.contains(['bar', 'line'], this.props.mode) && i === 0) {
                // here label is an array of length 1 and contains a number
                return this.dateClasses.representative(label, originIndex) || '';
            } else if (this.props.mode === 'pie' && i === 0) {
                // here label is an array of length at least one containing string or numbers
                var labelCopy = label.slice(0);
                if (originIndex !== undefined) {
                    labelCopy.splice(i, 1, this.dateClasses.representative(label[i], originIndex));
                } else {
                    labelCopy.splice(i, 1, this.dateClasses.dateClassMembers(label[i]));
                }
                return labelCopy.join('/');
            }
            // here label is an array containing strings or numbers.
            return label.join('/') || _t('Total');
        }

        /**
         * Used to format correctly the values in tooltips and yAxes
         *
         * @private
         * @param {number} value
         * @returns {string} The value formatted using fieldUtils.format.float
         */
        _formatValue(value) {
            //debugger;
            var measureField = this.fields[this.props.measure];
            var formatter = fieldUtils.format.float;
            var formatedValue = formatter(value, measureField, FORMAT_OPTIONS);
            return formatedValue;
        }

        /**
         * Returns the options used to generate the chart legend.
         *
         * @private
         * @param {Number} datasetsCount
         * @returns {Object}
         */
        _getLegendOptions(datasetsCount) {
            var legendOptions = {
                display: datasetsCount <= MAX_LEGEND_LENGTH,
                position: 'top',
                // TODO
                //onHover: this._onlegendTooltipHover.bind(this),
                //onLeave: this._onLegendTootipLeave.bind(this),
            };
            var self = this;
            if (_.contains(['bar', 'line'], this.props.mode)) {
                var referenceColor;
                if (this.props.mode === 'bar') {
                    referenceColor = 'backgroundColor';
                } else {
                    referenceColor = 'borderColor';
                }
                legendOptions.labels = {
                    generateLabels: function (chart) {
                        var data = chart.data;
                        return data.datasets.map(function (dataset, i) {
                            return {
                                text: self._shortenLabel(dataset.label),
                                fullText: dataset.label,
                                fillStyle: dataset[referenceColor],
                                hidden: !chart.isDatasetVisible(i),
                                lineCap: dataset.borderCapStyle,
                                lineDash: dataset.borderDash,
                                lineDashOffset: dataset.borderDashOffset,
                                lineJoin: dataset.borderJoinStyle,
                                lineWidth: dataset.borderWidth,
                                strokeStyle: dataset[referenceColor],
                                pointStyle: dataset.pointStyle,
                                datasetIndex: i,
                            };
                        });
                    },
                };
            } else {
                legendOptions.labels = {
                    generateLabels: function (chart) {
                        var data = chart.data;
                        var metaData = data.datasets.map(function (dataset, index) {
                            return chart.getDatasetMeta(index).data;
                        });
                        return data.labels.map(function (label, i) {
                            var hidden = metaData.reduce(
                                function (hidden, data) {
                                    if (data[i]) {
                                        hidden = hidden || data[i].hidden;
                                    }
                                    return hidden;
                                },
                                false
                            );
                            var fullText = self._relabelling(label);
                            var text = self._shortenLabel(fullText);
                            return {
                                text: text,
                                fullText: fullText,
                                fillStyle: label.isNoData ? '#d3d3d3' : self._getColor(i),
                                hidden: hidden,
                                index: i,
                            };
                        });
                    },
                };
            }
            return legendOptions;
        }

        _shortenLabel(label) {
            // string returned could be 'wrong' if a groupby value contain a '/'!
            var groups = label.split("/");
            var shortLabel = groups.slice(0, 3).join("/");
            if (shortLabel.length > 30) {
                shortLabel = shortLabel.slice(0, 30) + '...';
            } else if (groups.length > 3) {
                shortLabel = shortLabel + '/...';
            }
            return shortLabel;
        }


        /**
         * Returns the options used to generate the chart axes.
         *
         * @private
         * @returns {Object}
         */
        _getScaleOptions() {
            var self = this;
            if (_.contains(['bar', 'line'], this.props.mode)) {
                return {
                    xAxes: [{
                        type: 'category',
                        scaleLabel: {
                            display: this.props.processedGroupBy.length && !this.isEmbedded,
                            labelString: this.props.processedGroupBy.length ?
                                this.fields[this.props.processedGroupBy[0].split(':')[0]].string : '',
                        },
                        ticks: {
                            // don't use bind:  callback is called with 'index' as second parameter
                            // with value labels.indexOf(label)!
                            callback: function (label) {
                                return self._relabelling(label);
                            },
                        },
                    }],
                    yAxes: [{
                        type: 'linear',
                        scaleLabel: {
                            display: !this.isEmbedded,
                            labelString: this.fields[this.props.measure].string,
                        },
                        ticks: {
                            callback: this._formatValue.bind(this),
                            suggestedMax: 0,
                            suggestedMin: 0,
                        }
                    }],
                };
            }
            return {};
        }
    }

    GraphOwlRenderer.template = 'web.GraphOwlRenderer';
    return GraphOwlRenderer;

});