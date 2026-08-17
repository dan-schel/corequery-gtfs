import type { StopTimesCsv } from "../../data/raw/schedule-csvs.js";

/**
 * Responsible for checking that in a list of stop times, the stop_sequence
 * values start from 1 and increment by 1 each time. Where stop_sequence values
 * are duplicated, this classes uses the earlier stop time for that stop. Any
 * deviation from the incrementing pattern is reported and then rectified as
 * best as possible.
 */
export class GtfsStopTimeNormaliser {
  constructor(
    private readonly _onError: (error: GtfsStopTimeNormalisationError) => void,
  ) {}

  normalise(unsortedStopTimes: StopTimesCsv): StopTimesCsv | null {
    const sortedStopTimes = [...unsortedStopTimes].sort(
      (a, b) => a.stop_sequence - b.stop_sequence,
    );

    if (this._isRegular(sortedStopTimes)) return sortedStopTimes;

    // Sometimes we've seen trips in the regional feed where the rows are
    // duplicated (sometimes with different arrival/departure times). In these
    // cases, it seems like Google Maps just uses whichever sequence comes
    // first, so that's what this code is doing.
    //
    // In an ideal future world, if we detect that both trips contain the same
    // stops, we should use the earliest departure times for each stop to be
    // pessimistic (and still show the other sequence of stopping times as a
    // disruption about having ambiguous stopping times).
    if (this._isMultipleRegularSequences(unsortedStopTimes)) {
      this._onError(new MultipleStopSequencesError(unsortedStopTimes));

      return this._extractFirstRegularSequence(unsortedStopTimes);
    }

    // Are there any other cases we can handle gracefully? I expect we might see
    // some other cases pop up in the future, but this is all I know for now!
    //
    // ⚠️ IMPORTANT: This class is meant to output the stop times in the order
    // they should be interpreted as for TrainQuery. It should NOT modify the
    // stop_sequence values themselves (i.e. if there's gaps, leave them in)
    // because we may need to use those when matching updates in the GTFS-RT
    // feed to certain stops on the trip.
    this._onError(new InvalidStopSequenceError(unsortedStopTimes));
    return null;
  }

  /**
   * Returns true if the stop times make a perfect sequence starting from 1, and
   * is at least of length 2.
   */
  private _isRegular(sortedStopTimes: StopTimesCsv): boolean {
    return (
      sortedStopTimes.length >= 2 &&
      sortedStopTimes.every((x, i) => x.stop_sequence === i + 1) &&
      !this._requiresTimeTravelInFirstRegularSequence(sortedStopTimes)
    );
  }

  /**
   * Returns true if the stop times (unsorted, so in the order given in
   * stop_times.csv) form one or more regular sequences restarting at 1 each
   * time. The only caveat is that all sequences must be at least of length 2.
   *
   * Valid:
   * - `1, 2, 3, 4, 1, 2, 3`
   *
   * Invalid:
   * - `1, 2, 3, 2, 3, 4`
   * - `1, 2, 4, 5, 6, 1, 2`
   * - `1, 2, 3, 1, 1, 2, 3`
   * - `1`
   * - `1, 1, 1`
   */
  private _isMultipleRegularSequences(
    unsortedStopTimes: StopTimesCsv,
  ): boolean {
    let expectedStopSequence = 1;
    for (const stopTime of unsortedStopTimes) {
      if (stopTime.stop_sequence === expectedStopSequence) {
        expectedStopSequence++;
      } else if (stopTime.stop_sequence === 1 && expectedStopSequence > 2) {
        expectedStopSequence = 2;
      } else {
        return false;
      }
    }

    // If we left the loop where we'd next expect a 3 (or more), then we must've
    // found (at least) 2 stops in the last sequence.
    const lastSequenceHadAtLeastTwoStops = expectedStopSequence > 2;

    return (
      lastSequenceHadAtLeastTwoStops &&
      !this._requiresTimeTravelInFirstRegularSequence(unsortedStopTimes)
    );
  }

  private _extractFirstRegularSequence(stopTimes: StopTimesCsv): StopTimesCsv {
    return stopTimes.filter((x, i) => x.stop_sequence === i + 1);
  }

  private _requiresTimeTravelInFirstRegularSequence(
    stopTimes: StopTimesCsv,
  ): boolean {
    return stopTimes.some((x, i) => {
      // We're ignoring everything after the first regular sequence.
      if (x.stop_sequence !== i + 1) return false;

      if (x.arrival_time.isAfter(x.departure_time)) return true;

      const previousStopTime = stopTimes[i - 1];

      if (
        previousStopTime != null &&
        previousStopTime.departure_time.isAfter(x.arrival_time)
      ) {
        return true;
      }

      return false;
    });
  }
}

export type GtfsStopTimeNormalisationError =
  | InvalidStopSequenceError
  | MultipleStopSequencesError;

export class InvalidStopSequenceError extends Error {
  readonly type = "stop-sequence-duplicated";
  constructor(readonly stopTimes: StopTimesCsv) {
    super();
  }
  // The trip_id is accessible, e.g.:
  // get tripId() {
  //   return this.stopTimes[0]?.trip_id ?? null;
  // }
}

export class MultipleStopSequencesError extends Error {
  readonly type = "multiple-stop-sequences";
  constructor(readonly stopTimes: StopTimesCsv) {
    super();
  }
}
