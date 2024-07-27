import inspect
import json

from flask import Flask, render_template


def export_module_info(module):
  module_info = {
    "classes": {},
    "functions": {}
  }

  for name, obj in inspect.getmembers(module):
    if inspect.isclass(obj):
      # Add class and its methods
      class_info = {"methods": {}}
      for method_name, method in inspect.getmembers(obj, predicate=inspect.isfunction):
        method_info = {
          "parameters": [param.name for param in inspect.signature(method).parameters.values() if param.name != 'self']
        }
        class_info["methods"][method_name] = method_info
      module_info["classes"][name] = class_info
    elif inspect.isfunction(obj):
      # Add function and its parameters
      function_info = {
        "parameters": [param.name for param in inspect.signature(obj).parameters.values()]
      }
      module_info["functions"][name] = function_info

  return module_info


def start(lib):
  # get all classes in the lib, and all methods
  module_info = export_module_info(lib)
  print(module_info)

  # start flask server


app = Flask(__name__)

@app.route("/")
def hello():
  return render_template("index.html", modules=[
    {
      "name": "module1",
      "classes": [
        {
          "name": "Class1",
          "methods": [
            {
              "name": "method1",
              "parameters": ["param1", "param2"]
            }
          ]
        }
      ],
      "functions": [
        {
          "name": "function1",
          "parameters": ["param1", "param2"]
        }
      ],
      "variables": [
        {
          "name": "variable1",
          "value": 1
        }
      ]
    }
  ])


if __name__ == "__main__":
  start(json)
  app.run(port=5001, debug=True)
