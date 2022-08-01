import React from "react";
import { Route, Routes } from "react-router-dom";
import Main from "./Components/Main/Main";
import NotFound from "./Components/NotFound/NotFound";
import Floorplan from "./Components/Floorplan/Floorplan";
import FloorplanView from "./Components/FloorplanView/FloorplanView";
import Search from "./Components/Search/Search";

function Router() {
    return (
        <div className="App">
            <Routes>
                <Route path="/" element={<Main/>} />
                <Route path="/floorplan" element={<Floorplan/>} />
                <Route path="/search" element={<Search/>} />
                <Route path="/floorplanview/*" element={<FloorplanView/>} />
                <Route path="*" element={<NotFound/>} />
            </Routes>
        </div>
    );
}

export default Router;