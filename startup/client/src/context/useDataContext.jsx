import { useContext } from "react";
import { DataContext } from "./DataContext";

const useDataContext = () => useContext(DataContext);

export { useDataContext };
