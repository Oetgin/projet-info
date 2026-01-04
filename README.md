# projet-info

## Grafana

Dashboard config

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": {
          "type": "grafana",
          "uid": "-- Grafana --"
        },
        "enable": false,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "datasource": {
        "type": "mysql",
        "uid": "af8z8up7exnnkb"
      },
      "description": "",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "showValues": false,
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "line"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              }
            ]
          },
          "unit": "Slots"
        },
        "overrides": [
          {
            "matcher": {
              "id": "byName",
              "options": "capacitesoliste"
            },
            "properties": [
              {
                "id": "color",
                "value": {
                  "fixedColor": "red",
                  "mode": "fixed"
                }
              },
              {
                "id": "displayName",
                "value": "Capacity"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "jrdinfosoliste"
            },
            "properties": [
              {
                "id": "displayName",
                "value": "Free slots"
              },
              {
                "id": "custom.hideFrom",
                "value": {
                  "legend": true,
                  "tooltip": false,
                  "viz": true
                }
              },
              {
                "id": "color",
                "value": {
                  "fixedColor": "green",
                  "mode": "fixed"
                }
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "capacitesoliste - jrdinfosoliste"
            },
            "properties": [
              {
                "id": "displayName",
                "value": "Used slots"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "prediction"
            },
            "properties": [
              {
                "id": "displayName",
                "value": "Used slots prediction"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "upper_bound"
            },
            "properties": [
              {
                "id": "color",
                "value": {
                  "mode": "fixed"
                }
              },
              {
                "id": "custom.fillBelowTo",
                "value": "lower_bound"
              },
              {
                "id": "custom.hideFrom",
                "value": {
                  "legend": true,
                  "tooltip": false,
                  "viz": false
                }
              },
              {
                "id": "displayName",
                "value": "Upper bound error"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "lower_bound"
            },
            "properties": [
              {
                "id": "color",
                "value": {
                  "mode": "fixed"
                }
              },
              {
                "id": "custom.hideFrom",
                "value": {
                  "legend": true,
                  "tooltip": false,
                  "viz": false
                }
              },
              {
                "id": "displayName",
                "value": "Lower bound error"
              }
            ]
          },
          {
            "matcher": {
              "id": "byName",
              "options": "capacity"
            },
            "properties": [
              {
                "id": "color",
                "value": {
                  "fixedColor": "red",
                  "mode": "fixed"
                }
              },
              {
                "id": "custom.hideFrom",
                "value": {
                  "legend": true,
                  "tooltip": false,
                  "viz": false
                }
              },
              {
                "id": "displayName",
                "value": "Capacity"
              }
            ]
          }
        ]
      },
      "gridPos": {
        "h": 10,
        "w": 24,
        "x": 0,
        "y": 0
      },
      "id": 1,
      "maxPerRow": 2,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "hoverProximity": 1,
          "mode": "multi",
          "sort": "none"
        }
      },
      "pluginVersion": "12.3.1",
      "repeat": "parc",
      "repeatDirection": "h",
      "targets": [
        {
          "dataset": "open_data_rennes",
          "datasource": {
            "type": "mysql",
            "uid": "cf8vma2fwi0owa"
          },
          "editorMode": "code",
          "format": "table",
          "hide": false,
          "rawQuery": true,
          "rawSql": "SELECT capacitesoliste, jrdinfosoliste, lastupdate\r\nFROM open_data_rennes.`parcs-relais`\r\nWHERE idparc = $parc\r\n  AND lastupdate BETWEEN LEAST(NOW(), $__timeFrom()) AND LEAST(NOW(), $__timeTo())\r\n  AND etatouverture = 'OUVERT'",
          "refId": "CVI query",
          "sql": {
            "columns": [
              {
                "parameters": [
                  {
                    "name": "jrdinfosoliste",
                    "type": "functionParameter"
                  }
                ],
                "type": "function"
              },
              {
                "parameters": [
                  {
                    "name": "lastupdate",
                    "type": "functionParameter"
                  }
                ],
                "type": "function"
              }
            ],
            "groupBy": [],
            "limit": 1000,
            "orderBy": {
              "property": {
                "name": "lastupdate",
                "type": "string"
              },
              "type": "property"
            },
            "orderByDirection": "DESC",
            "whereJsonTree": {
              "children1": [
                {
                  "id": "88a88aba-cdef-4012-b456-719b7abc150c",
                  "properties": {
                    "field": "idparc",
                    "fieldSrc": "field",
                    "operator": "equal",
                    "value": [
                      "CVI"
                    ],
                    "valueError": [
                      null
                    ],
                    "valueSrc": [
                      "value"
                    ],
                    "valueType": [
                      "text"
                    ]
                  },
                  "type": "rule"
                },
                {
                  "id": "8b889b8a-89ab-4cde-b012-319b7abd745a",
                  "properties": {
                    "field": "lastupdate",
                    "fieldSrc": "field",
                    "operator": "between",
                    "value": [
                      "timeFilter",
                      "timeFilter"
                    ],
                    "valueError": [
                      null,
                      null
                    ],
                    "valueSrc": [
                      "value",
                      "value"
                    ],
                    "valueType": [
                      "datetime",
                      "datetime"
                    ]
                  },
                  "type": "rule"
                }
              ],
              "id": "8b88bbb9-0123-4456-b89a-b19b7ab3f14b",
              "type": "group"
            },
            "whereString": "(idparc = 'CVI' AND lastupdate BETWEEN NULL AND NULL)"
          },
          "table": "`parcs-relais`"
        },
        {
          "dataset": "open_data_rennes",
          "datasource": {
            "type": "mysql",
            "uid": "af8z8up7exnnkb"
          },
          "editorMode": "code",
          "format": "table",
          "hide": false,
          "rawQuery": true,
          "rawSql": "SELECT p.capacity, p.upper_bound, p.prediction, p.lower_bound, p.target_time, p.prediction_time\r\nFROM predictions.predictions p\r\nJOIN (\r\n  SELECT MAX(prediction_time) AS max_pred_time\r\n  FROM predictions.predictions\r\n  WHERE park_id = $parc\r\n) m ON p.prediction_time = m.max_pred_time\r\nWHERE p.park_id = $parc\r\n  AND p.target_time BETWEEN GREATEST(NOW(), $__timeFrom()) AND GREATEST(NOW(), $__timeTo());",
          "refId": "A",
          "sql": {
            "columns": [
              {
                "parameters": [],
                "type": "function"
              }
            ],
            "groupBy": [
              {
                "property": {
                  "type": "string"
                },
                "type": "groupBy"
              }
            ],
            "limit": 50
          }
        }
      ],
      "title": "${parc}",
      "transformations": [
        {
          "id": "calculateField",
          "options": {
            "binary": {
              "left": {
                "matcher": {
                  "id": "byName",
                  "options": "capacitesoliste"
                }
              },
              "operator": "-",
              "right": {
                "matcher": {
                  "id": "byName",
                  "options": "jrdinfosoliste"
                }
              }
            },
            "mode": "binary",
            "reduce": {
              "include": [],
              "reducer": "sum"
            },
            "replaceFields": false
          }
        }
      ],
      "type": "timeseries"
    }
  ],
  "preload": false,
  "schemaVersion": 42,
  "tags": [],
  "templating": {
    "list": [
      {
        "allowCustomValue": false,
        "current": {
          "text": [
            "CVI",
            "HFR",
            "JFK",
            "LGA",
            "POT",
            "PRE",
            "SJG",
            "VU"
          ],
          "value": [
            "CVI",
            "HFR",
            "JFK",
            "LGA",
            "POT",
            "PRE",
            "SJG",
            "VU"
          ]
        },
        "definition": "SELECT DISTINCT idparc FROM open_data_rennes.`parcs-relais`;",
        "label": "Parcs-relais",
        "multi": true,
        "name": "parc",
        "options": [],
        "query": "SELECT DISTINCT idparc FROM open_data_rennes.`parcs-relais`;",
        "refresh": 1,
        "regex": "",
        "type": "query"
      }
    ]
  },
  "time": {
    "from": "now-5d",
    "to": "now+1d"
  },
  "timepicker": {},
  "timezone": "browser",
  "title": "Parcs-relais",
  "uid": "add4wgs",
  "version": 10
}
```