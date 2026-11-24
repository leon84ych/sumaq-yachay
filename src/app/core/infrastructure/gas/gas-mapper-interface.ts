


// Generic interface for mapping between domain records and GAS raw data
export interface GASMapperInterface<TRecord, TRaw, TRowValues> {
  
    /**
     * Maps the raw data from GAS to a domain record
     * @param raw The raw data from GAS to be mapped to a domain record
     */
    toRecord(raw: TRaw): TRecord;
  
    /**
     * Maps a domain record to the raw GAS data structure
     * @param record The record to be mappet to a raw GAS data structure
     */
    toRaw(record: TRecord): TRaw;
  

    /**
     * Maps a domain record into the row values to be sent to GAS
     * @param record maps the record into the columns to be sent to GAS
     */
    toRowValues(record: TRecord): TRowValues;
}