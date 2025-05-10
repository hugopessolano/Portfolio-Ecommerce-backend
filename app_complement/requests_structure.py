from pydantic import BaseModel, computed_field
from typing import List
from itertools import islice
import asyncio
import httpx

BASE_URL = 'http://127.0.0.1:8000'
BATCH_SIZE = 1 

class BaseRequest(BaseModel):
    base_url:str = BASE_URL
    endpoint:str
    headers:dict | None = None
    payload:dict | None = None
    
    @computed_field
    def url(self) -> str:
        base = self.base_url.rstrip('/')
        endpoint = self.endpoint.strip('/')
        return f'{base}/{endpoint}'


async def execute_request(client:httpx.AsyncClient, r:BaseRequest) -> list:
    response = client.post(r.url, headers=r.headers, json=r.payload, timeout=None)
    return response

async def process_batch(client: httpx.AsyncClient, batch: List[BaseRequest]) -> List[httpx.Response]:
    coroutines = [execute_request(client, request) for request in batch]
    batch_responses = await asyncio.gather(*coroutines)
    return batch_responses

def batch_generator(items: List, batch_size: int):
    iterator = iter(items)
    batch = list(islice(iterator, batch_size))
    while batch:
        yield batch
        batch = list(islice(iterator, batch_size))

async def execute_batch_requests(requests: List[BaseRequest]):
    async with httpx.AsyncClient() as client:
        # Procesar por lotes
        batch_coroutines = []
        for batch in batch_generator(requests, BATCH_SIZE):
            # Collect batch coroutines
            batch_coroutines.append(process_batch(client, batch))
        
        # Execute all batch coroutines
        batch_responses = await asyncio.gather(*batch_coroutines)
        # Flatten responses
        all_responses = [await resp for batch in batch_responses for resp in batch]
    return all_responses