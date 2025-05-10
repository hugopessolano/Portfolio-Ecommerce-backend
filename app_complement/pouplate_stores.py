import os
import asyncio
from schemas.stores_schemas import StoreCreate
import pandas as pd
from requests_structure import BaseRequest, execute_batch_requests

SCRIPT_DIR = os.path.dirname(__file__)
CSV_NAME = 'fake_stores.csv'

async def build_store_create_requests(store:StoreCreate) -> BaseRequest:
    r = BaseRequest(endpoint='stores', 
                    headers={'Content-Type': 'application/json'}, 
                    payload=store.model_dump())
    return r


async def main():
    stores_df = pd.read_csv(os.path.join(SCRIPT_DIR, CSV_NAME))
    stores = stores_df.to_dict('records')
    stores_list = [StoreCreate(**store) for store in stores]
    
    request_tasks = [asyncio.create_task(build_store_create_requests(store)) for store in stores_list]
    requests = await asyncio.gather(*request_tasks)
    responses = await execute_batch_requests(requests)
    return responses
    
    

if __name__ == '__main__':
    responses = asyncio.run(main())
    print(f'Processed {len(responses)} requests successfully')