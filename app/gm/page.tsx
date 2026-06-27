"use client";

import { useState } from "react";
import Cabezal from "@/app/gm/gmcomponents/uiElements/home/Cabezal";
import Filter from "@/app/gm/gmcomponents/uiElements/home/Filter";
import SVGRow from "@/app/gm/gmcomponents/uiElements/home/SVGRow";
import TablaHome from "@/app/gm/gmcomponents/uiElements/home/TablaHome";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState("codNomComFis");

  return (
    <main className="min-h-screen bg-[#f3f5f7] px-4 py-8 text-slate-800  ">
      <div className="flex flex-col border border-gray-800 bg-[#164a75] px-2 pb-5">

        <Cabezal />

        <SVGRow />

          <Filter
            searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
            selectedField={selectedField} onSelectedFieldChange={setSelectedField}
          />

          <TablaHome searchTerm={searchTerm} selectedField={selectedField} />
      </div>

    </main>
  );
}
