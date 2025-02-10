import boto3
import json
import time
import os
from botocore.exceptions import BotoCoreError, ClientError

# Initialize DynamoDB client
os.environ["AWS_PROFILE"] = "XXXXXXXX"  # Change to your actual AWS profile
dynamodb = boto3.client("dynamodb")

def batch_write_to_dynamodb(table_name, batch_files, max_retries=5, backoff_factor=2):
    """
    Writes batch JSON files to DynamoDB with automatic retries for throttling.

    :param table_name: Name of the DynamoDB table.
    :param batch_files: List of JSON batch files to upload.
    :param max_retries: Maximum number of retries on throttling.
    :param backoff_factor: Backoff factor for exponential retry delay.
    """
    for batch_file in batch_files:
        with open(batch_file, "r", encoding="utf-8") as infile:
            data = json.load(infile)

        request_items = data.get("RequestItems", {}).get(table_name, [])

        if not request_items:
            print(f"Skipping {batch_file}, no items found.")
            continue

        retries = 0
        while retries < max_retries:
            try:
                response = dynamodb.batch_write_item(RequestItems={table_name: request_items})
                
                # Check for unprocessed items (due to throttling)
                unprocessed = response.get("UnprocessedItems", {}).get(table_name, [])
                
                if not unprocessed:
                    print(f"Successfully uploaded {batch_file}.")
                    break  # Exit retry loop if everything is processed
                
                print(f"Throttled. Retrying {batch_file} with {len(unprocessed)} unprocessed items.")
                request_items = unprocessed  # Retry only unprocessed items
                
            except (BotoCoreError, ClientError) as e:
                print(f"Error writing {batch_file}: {str(e)}")
                
            retries += 1
            sleep_time = backoff_factor ** retries
            print(f"Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)

        if retries == max_retries:
            print(f"Max retries reached for {batch_file}. Some items may not be written.")

if __name__ == "__main__":
    table_name = "Bounan-AniMan-FilesTableXXXXXXXXXXX"  # Change to your actual DynamoDB table name
    batch_files = ['chunks/' + f for f in os.listdir('chunks')]

    if not batch_files:
        print("No batch files found. Make sure you ran the split script first.")
    else:
        batch_write_to_dynamodb(table_name, batch_files)
