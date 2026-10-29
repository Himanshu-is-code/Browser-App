cmake_minimum_required(VERSION 3.22.1)

project(coloros_browser_engine LANGUAGES CXX)

add_library(native-lib SHARED engine.cpp)

find_library(android-log log)
target_link_libraries(native-lib PRIVATE ${android-log})
