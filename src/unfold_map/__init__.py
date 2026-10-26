"""Unfold's standard-library scripts as a command-line tool (distribution name ``unfold-map``).

The scripts themselves live in the skill folder (``skill/unfold/scripts``) and stay runnable
on their own. The wheel ships that folder as ``unfold_map/skill``; ``unfold_map.cli`` finds it
and runs the script for each subcommand.
"""
__version__ = "0.4.0"
