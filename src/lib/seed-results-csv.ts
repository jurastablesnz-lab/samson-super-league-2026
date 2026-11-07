// Vite inlines this file for the admin one-tap import. Node tests read the CSV
// from disk instead — they do not import this module.
import csv from "../../data/seed/master-results.csv?raw";

export default csv;
