
import { Response, PaginatedResponse } from "../../features/domain-1/shared/model/domain-shared-model";

export interface BookRepositoryInterface<TRow> {

    /**
     * Get the health status of the book service
     */
    getHealth(): Promise<string>;

    /**
     * Get the list of books avaiable
     */
    getBooks(page: number, pageSize: number): Promise<Response<PaginatedResponse<TRow>>>;


    createItem(item: TRow): Promise<Response<TRow>>;


    updateItem(item: TRow): Promise<Response<TRow>>;


    deleteItem(item: TRow): Promise<Response<string>>;


    /**
     * Clone a whole book from a public sheet into the user's book
     */
    cloneBook(sheetUrl: string): Promise<Response<unknown>>;


}