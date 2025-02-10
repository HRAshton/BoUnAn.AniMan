import json

def split_jsonl_to_batches(input_file, batch_size=25, output_prefix="batch"):
    """
    Splits a JSONL file into multiple smaller JSON files containing batches of items for DynamoDB batch-write.

    :param input_file: Path to the input JSONL file.
    :param batch_size: Number of items per batch (max 25 for DynamoDB).
    :param output_prefix: Prefix for the output batch files.
    """
    batches = []
    with open(input_file, "r", encoding="utf-8") as infile:
        batch = []
        for line in infile:
            batch.append(json.loads(line)["Item"])
            if len(batch) == batch_size:
                batches.append(batch)
                batch = []

        # Append remaining items if any
        if batch:
            batches.append(batch)

    # Save batches as separate JSON files
    for i, batch in enumerate(batches):
        batch_file = f"chunks/{output_prefix}_{i+1}.json"
        with open(batch_file, "w", encoding="utf-8") as outfile:
            json.dump({"RequestItems": {"Bounan-AniMan-FilesTableXXXXXXXXXXXX": [{"PutRequest": {"Item": item}} for item in batch]}}, outfile, indent=4)
        print(f"Batch {i+1} saved as {batch_file}")

if __name__ == "__main__":
    input_file = "all.json"  # Replace with your actual file path
    split_jsonl_to_batches(input_file)
