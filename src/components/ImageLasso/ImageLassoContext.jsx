import { createContext, useContext } from "react";
export const ImageLassoContext = createContext();
export const useImageLasso = () => useContext(ImageLassoContext);
