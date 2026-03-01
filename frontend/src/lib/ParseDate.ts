export function parse(timestamp: string) {
    // Use a regular expression to parse the timestamp
    const match = timestamp.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/
    );
  
    if (!match) {
      return "Invalid Timestamp";
    }
  
    const [
      ,
      year,
      month,
      day,
      hour,
      minute,
      second,
      fractionalSecond = '',
      timezone = '',
    ] = match;
  
    // Build the date string for parsing
    const dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}${timezone}`;
  
    // Create a Date object
    const date = new Date(dateString);
  
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
  
    // Format date components
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short', // e.g., 'January'
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true, // Use 12-hour time format
    };
  
    const formattedDate = date.toLocaleString('en-IN', options);
  
    // Extract microseconds without the leading dot and pad to 6 digits
    const microseconds = fractionalSecond
      ? fractionalSecond.substring(1).padEnd(6, '0')
      : '';
  
    // Combine formatted date with microseconds if present
    const result = microseconds
      ? `${formattedDate}`
      : formattedDate;
  
    return result;
  }
  